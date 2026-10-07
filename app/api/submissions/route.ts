import { NextResponse } from 'next/server';
import { createPublicClient, http, parseEventLogs, parseAbiItem } from 'viem';
import { sepolia } from 'viem/chains';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';

const client = createPublicClient({
  chain: sepolia,
  transport: http(process.env.RPC_URL || 'https://rpc.sepolia.org')
});

const QuizCompletedEvent = parseAbiItem('event QuizCompleted(address indexed user, uint256 score)');

const SubmissionSchema = z.object({
  transactionHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/, 'Invalid transaction hash format')
});

// ponytail: simplest memory rate limit. ignores serverless scaling.
const rateLimit = new Map<string, number>();

export async function POST(req: Request) {
  const ip = req.headers.get('x-forwarded-for') || 'unknown';
  const now = Date.now();
  if (process.env.NODE_ENV !== 'test' && rateLimit.get(ip) && now - rateLimit.get(ip)! < 60000) {
    return NextResponse.json({ error: { code: 'RATE_LIMIT', message: 'Too Many Requests' } }, { status: 429 });
  }
  rateLimit.set(ip, now);
  try {
    const body = await req.json().catch(() => ({}));
    
    // 1. Boundary Validation
    const result = SubmissionSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: result.error.flatten().fieldErrors
        }
      }, { status: 422 });
    }

    const { transactionHash } = result.data;

    // 2. Claim Idempotency Key Atomically
    try {
      await prisma.processedTransaction.create({
        data: { hash: transactionHash }
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        return NextResponse.json({
          error: {
            code: 'DUPLICATE_SUBMISSION',
            message: 'Transaction has already been processed'
          }
        }, { status: 409 });
      }
      throw error;
    }

    // 3. Process the external API (Viem / Blockchain)
    const receipt = await client.getTransactionReceipt({ hash: transactionHash as `0x${string}` });
    
    if (receipt.status !== 'success') {
      return NextResponse.json({
        error: {
          code: 'TRANSACTION_FAILED',
          message: 'Transaction failed or is pending'
        }
      }, { status: 400 });
    }

    const parsedLogs = parseEventLogs({
      abi: [QuizCompletedEvent],
      logs: receipt.logs,
      eventName: 'QuizCompleted'
    });

    if (!parsedLogs.length) {
      return NextResponse.json({
        error: { code: 'INVALID_TRANSACTION', message: 'QuizCompleted event not found in transaction logs' }
      }, { status: 400 });
    }

    const verifiedUser = parsedLogs[0].args.user as string;
    const verifiedScore = Number(parsedLogs[0].args.score);

    // 4. Update the Leaderboard
    let entry = await prisma.leaderboard.findUnique({ where: { user: verifiedUser } });
    if (!entry) {
      entry = await prisma.leaderboard.create({ data: { user: verifiedUser, score: verifiedScore } });
    } else if (verifiedScore > entry.score) {
      entry = await prisma.leaderboard.update({ where: { user: verifiedUser }, data: { score: verifiedScore } });
    }

    return NextResponse.json({ success: true, entry });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An internal server error occurred'
      }
    }, { status: 500 });
  }
}
