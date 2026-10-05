import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const score = searchParams.get('score') || '0';
    const streak = searchParams.get('streak') || '0';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0A0A16',
            color: 'white',
            fontFamily: 'sans-serif',
            padding: '40px',
            position: 'relative',
          }}
        >
          {/* Background decoration */}
          <div
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '120%',
              height: '120%',
              background: 'radial-gradient(circle, rgba(108,92,231,0.2) 0%, rgba(10,10,22,1) 70%)',
              zIndex: 0,
            }}
          />

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1,
            }}
          >
            <h1
              style={{
                fontSize: 80,
                fontWeight: 900,
                marginBottom: 20,
                background: 'linear-gradient(to right, #00FFCC, #6C5CE7)',
                backgroundClip: 'text',
                color: 'transparent',
                textAlign: 'center',
              }}
            >
              Quick Quiz
            </h1>

            <div
              style={{
                display: 'flex',
                gap: '40px',
                marginTop: '40px',
              }}
            >
              {/* Score Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '30px 50px',
                  borderRadius: '24px',
                  border: '1px solid rgba(0, 255, 204, 0.3)',
                }}
              >
                <span style={{ fontSize: 30, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 }}>Score</span>
                <span style={{ fontSize: 72, fontWeight: 'bold', color: '#00FFCC' }}>{score}</span>
              </div>

              {/* Streak Box */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '30px 50px',
                  borderRadius: '24px',
                  border: '1px solid rgba(255, 71, 87, 0.3)',
                }}
              >
                <span style={{ fontSize: 30, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2 }}>Streak</span>
                <span style={{ fontSize: 72, fontWeight: 'bold', color: '#FF4757' }}>{streak} 🔥</span>
              </div>
            </div>
            
            <p style={{ fontSize: 32, color: '#cbd5e1', marginTop: '60px' }}>
              Can you beat my score?
            </p>
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (e: unknown) {
    console.error(e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
