const BASE = 'http://localhost:8002'

export type TaskStatus = 'pending' | 'running' | 'done' | 'failed' | 'awaiting_checkpoint'

export interface KadooshTask {
  id: number
  title: string
  description: string | null
  status: TaskStatus
  task_type: string
  priority: number | null
  agent_id: number | null
  graph_plan: string | null
  computation_graph: string | null
  isaac_session_id: number | null
  due_at: string | null
  created_at: string
  updated_at: string
}

export interface KadooshSession {
  id: number
  title: string | null
  status: string
  agent_id: number
  cwd: string | null
  started_at: string
  ended_at: string | null
}

export interface KadooshExperiment {
  id: number
  name: string
  description: string | null
  status: string
  objective: string
  optimizer: string
  rounds_completed: number
  target_score: number | null
  scoring_rule: string | null
  created_at: string
}

export interface ComputationEvent {
  type: string
  label?: string
  output?: string
  error?: string
  step_index?: number
  ts?: string
}

async function get<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { 'X-Session-ID': 'synapse-build-ui' },
  })
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`)
  return r.json()
}

export async function listTeacherTasks(): Promise<KadooshTask[]> {
  const tasks: KadooshTask[] = await get('/tasks')
  return tasks.filter(t => t.task_type === 'teacher_task')
}

export async function getTask(id: number): Promise<KadooshTask> {
  return get(`/tasks/${id}`)
}

export async function listExperiments(): Promise<KadooshExperiment[]> {
  return get('/experiments')
}

export async function listSessions(agentId?: number): Promise<KadooshSession[]> {
  const path = agentId ? `/isaac-sessions?agent_id=${agentId}` : '/isaac-sessions'
  return get(path)
}

export function streamTaskEvents(
  taskId: number,
  onEvent: (ev: ComputationEvent) => void,
  onDone: () => void,
): () => void {
  const es = new EventSource(`${BASE}/tasks/${taskId}/stream`)
  es.onmessage = e => {
    try {
      const data = JSON.parse(e.data) as ComputationEvent
      onEvent(data)
      if (data.type === 'task_done' || data.type === 'task_failed') {
        es.close()
        onDone()
      }
    } catch {}
  }
  es.onerror = () => { es.close(); onDone() }
  return () => es.close()
}
