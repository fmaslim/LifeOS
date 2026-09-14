import type { GoalKpi, KpiData } from '../models/goal.ts'
export const kpiProgress = (kpi: GoalKpi) => kpi.target <= 0 ? 0 : Math.max(0, Math.min(100, Math.round(kpi.current / kpi.target * 100)))
export const kpiTrend = (kpi: GoalKpi) => { const history = [...kpi.history].sort((a,b)=>a.at.localeCompare(b.at)); if (history.length < 2) return 0; const previous = history.at(-2)!.value; return previous === 0 ? 0 : Math.round((history.at(-1)!.value - previous) / Math.abs(previous) * 1000) / 10 }
export interface KpiService { getKpiData(): KpiData; upsert(kpi: GoalKpi): void; archive(id: string): void; addSnapshot(id: string, value: number, at: string): void }
export class InMemoryKpiService implements KpiService {
  private kpis: GoalKpi[]
  constructor(seed: GoalKpi[] = []) { this.kpis = seed.map(kpi=>({ ...kpi, history:[...kpi.history] })) }
  getKpiData() { return { kpis: this.kpis.map(kpi=>({ ...kpi, history:[...kpi.history] })) } }
  upsert(kpi: GoalKpi) { const index=this.kpis.findIndex(item=>item.id===kpi.id); if(index<0)this.kpis.push({...kpi,history:[...kpi.history]}); else this.kpis[index]={...kpi,history:[...kpi.history]} }
  archive(id:string){this.kpis=this.kpis.map(kpi=>kpi.id===id?{...kpi,status:'archived'}:kpi)}
  addSnapshot(id:string,value:number,at:string){this.kpis=this.kpis.map(kpi=>kpi.id===id?{...kpi,current:value,history:[...kpi.history,{at,value}]}:kpi)}
}
const history=(one:number,two:number)=>[{at:'2026-08-01',value:one},{at:'2026-09-01',value:two}]
const seed:GoalKpi[]=[{id:'mrr',goalId:'goal-business',name:'SaaS MRR',area:'Business',target:10000,current:6400,unit:'USD',frequency:'monthly',status:'on-track',history:history(5200,6400)},{id:'views',goalId:'goal-content',name:'YouTube views',area:'Content',target:100000,current:72500,unit:'views',frequency:'monthly',status:'on-track',history:history(61000,72500)},{id:'subscribers',name:'YouTube subscribers',area:'Content',target:5000,current:3280,unit:'subscribers',frequency:'monthly',status:'at-risk',history:history(3010,3280)},{id:'prospects',name:'Prospecting volume',area:'Business',target:200,current:146,unit:'prospects',frequency:'weekly',status:'on-track',history:history(118,146)},{id:'project',name:'Roadmap progress',area:'Business',target:100,current:82,unit:'%',frequency:'weekly',status:'on-track',history:history(68,82)}]
export class MockKpiService extends InMemoryKpiService{constructor(){super(seed)}}
