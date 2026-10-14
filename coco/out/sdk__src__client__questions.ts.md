# sdk/src/client/questions.ts
lines:258 exports:RandomQuestionOptions,getRandomQuestion,randomQuestion,getQuestionById,getQuestion,getQuestionCount,countQuestions,createQuestion,generateQuestion,disputeQuestion,get5050EliminatedIndices,fiftyFifty,QuestionsResource
---
import { isClient, getDefaultClient, type ClientLike } from './http';
import type { QuickQuizClient } from './client';
import type { ClientQuestion, CreateQuestionInput, GeneratedQuestion } from '../types';

export interface RandomQuestionOptions {
  category?: string;
  exclude?: string[] | string;
  client?: ClientLike;
}

/**
 * Fetch a random question, optionally filtering by category and excluding question IDs.
 */
export async function getRandomQuestion(
  clientOrOptions?: ClientLike | RandomQuestionOptions,
  maybeOptions?: Omit<RandomQuestionOptions, 'client'>
): Promise<ClientQuestion | null> {
  let client: ClientLike;
  let options: RandomQuestionOptions | undefined;

  if (isClient(clientOrOptions)) {
    client = clientOrOptions;
    options = maybeOptions;
  } else {
    options = clientOrOptions;
    client = options?.client ?? getDefaultClient();
  }

  return client.request<ClientQuestion | null>('/v1/questions/random', {
    method: 'GET',
    query: {
      category: options?.category,
      exclude: Array.isArray(options?.exclude) ? options.exclude.join(',') : options?.exclude,
    },
  });
}

export const randomQuestion = getRandomQuestion;

/**
