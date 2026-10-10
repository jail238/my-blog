import { parseNetScorePage, parseNetProfile } from '../utils/net-parser.js';
import { runNetCollector } from '../utils/net-collector.js';

export function GET() {
  return new Response(`(${runNetCollector.toString()})(${parseNetScorePage.toString()},${parseNetProfile.toString()},new URL(document.currentScript.src).origin);`, {
    headers: { 'Content-Type': 'application/javascript; charset=utf-8', 'Cache-Control': 'no-cache' },
  });
}
