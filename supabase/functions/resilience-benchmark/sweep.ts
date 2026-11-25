import { admin } from '../_shared/ai-gateway.ts';
import { batchBenchmark, readRows, readPhases } from './batch.ts';
import { aggregateSweep, validLevels, type Sweep } from './sweep-statistics.ts';
import { cellComplete, type Batch } from './statistics.ts';
function checked<T>(r: { data: T; error: { message: string } | null }) { if (r.error) throw new Error(r.error.message); return r.data; }
export async function sweepBenchmark(body: Record<string, unknown>): Promise<Response> {
  const db = admin(), action = body.action ?? 'run';
  if (!['run','summarize','export'].includes(String(action))) return Response.json({error:'Invalid action'}, {status:400});
  const id = body.batch_run_id ?? crypto.randomUUID();
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) return Response.json({error:'Valid batch_run_id required'}, {status:400});
  let sweep = checked(await db.from('benchmark_sweeps').select('*').eq('id',id).maybeSingle()) as Sweep | null;
  if (!sweep) {
    if (action !== 'run') return Response.json({error:'Sweep not found'}, {status:404});
    const levels = body.concurrency_levels ?? [1,5,10,20], reps = body.reps_per_level ?? 3, scenario = body.scenario ?? 'primary_failure';
    if (!validLevels(levels) || !Number.isInteger(reps) || Number(reps)<1 || Number(reps)>30 || scenario !== 'primary_failure' || (body.live !== undefined && body.live !== true)) return Response.json({error:'Invalid live sweep settings'}, {status:400});
    const children = Object.fromEntries(levels.map(c => [c,crypto.randomUUID()]));
    sweep = checked(await db.from('benchmark_sweeps').insert({id,scenario,concurrency_levels:levels,reps_per_level:reps,children}).select().single()) as Sweep;
    checked(await db.from('benchmark_batches').insert(levels.map(concurrency => ({id:children[concurrency],sweep_id:id,scenario,repetitions:reps,requests_per_phase:40,concurrency,cooldown_ms:10000}))));
  }
  if ((body.concurrency_levels && JSON.stringify(body.concurrency_levels)!==JSON.stringify(sweep.concurrency_levels)) || (body.reps_per_level !== undefined && body.reps_per_level !== sweep.reps_per_level) || (body.scenario !== undefined && body.scenario !== sweep.scenario) || (body.live !== undefined && body.live !== true)) return Response.json({error:'Sweep settings are immutable'}, {status:409});
  const batches = checked(await db.from('benchmark_batches').select('*').eq('sweep_id',id)) as Batch[];
  if (batches.length !== sweep.concurrency_levels.length) return Response.json({error:'Incomplete driver initialization; inspect before continuing'}, {status:409});
  if (action === 'run') {
    let next: Batch | undefined;
    for (const c of sweep.concurrency_levels) {
      const b = batches.find(b => b.concurrency === c);
      if (!b) continue;
      const phases = await readPhases(b.id), rows = await readRows(b.id);
      if (!Array.from({length:b.repetitions},(_,i)=>i+1).every(rep=>cellComplete(b,phases,rows,rep))) { next=b; break; }
    }
    if (next) { const response = await batchBenchmark({batch_run_id:next.id,restart_incomplete_cell:body.restart_incomplete_cell === true}); const progress = await response.json(); return Response.json({...progress,batch_run_id:id,child_batch_run_id:next.id,concurrency:next.concurrency}, {status:response.status}); }
  }
  const cells = await Promise.all(sweep.concurrency_levels.map(async c => { const batch = batches.find(b => b.concurrency===c); if (!batch) throw new Error('Missing load level'); return {batch,phases:await readPhases(batch.id),rows:await readRows(batch.id)}; }));
  if (action === 'export') {
    const fields=['batch_run_id','concurrency','rep_index','scenario','config','phase','call_index','path','success','degraded','latency_ms','tokens','http_status','created_at'];
    const rows=cells.flatMap(c=>c.rows);
    return new Response([fields.join(','),...rows.map(r=>fields.map(f=>JSON.stringify((r as unknown as Record<string,unknown>)[f]??null)).join(','))].join('\n'),{headers:{'Content-Type':'text/csv'}});
  }
  return Response.json(aggregateSweep(sweep,cells));
}
