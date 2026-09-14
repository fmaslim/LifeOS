import assert from 'node:assert/strict'
import test from 'node:test'
import { InMemoryKpiService, kpiProgress, kpiTrend } from '../src/services/KpiService.ts'
const kpi={id:'mrr',goalId:'goal',name:'MRR',area:'Business' as const,target:10000,current:6000,unit:'USD',frequency:'monthly' as const,status:'on-track' as const,history:[{at:'2026-08-01',value:5000},{at:'2026-09-01',value:6000}]}
test('KPI progress and trend calculations are deterministic and bounded',()=>{assert.equal(kpiProgress(kpi),60);assert.equal(kpiTrend(kpi),20);assert.equal(kpiProgress({...kpi,current:12000}),100);assert.equal(kpiProgress({...kpi,target:0}),0)})
test('KPIs can be created, edited, archived, linked, and snapshotted',()=>{const service=new InMemoryKpiService();service.upsert(kpi);service.addSnapshot('mrr',7000,'2026-10-01');assert.equal(service.getKpiData().kpis[0]?.current,7000);service.upsert({...service.getKpiData().kpis[0]!,goalId:'new-goal'});assert.equal(service.getKpiData().kpis[0]?.goalId,'new-goal');service.archive('mrr');assert.equal(service.getKpiData().kpis[0]?.status,'archived')})
