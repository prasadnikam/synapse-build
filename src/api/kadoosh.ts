const BASE = '/api'

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
    headers: { 'X-Session-ID': 'a2a:service' },
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
  const controller = new AbortController()
  fetch(`${BASE}/tasks/${taskId}/stream`, {
    headers: { 'X-Session-ID': 'a2a:service' },
    signal: controller.signal,
  }).then(async r => {
    if (!r.ok || !r.body) { onDone(); return }
    const reader = r.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        try {
          const data = JSON.parse(line.slice(5).trim()) as ComputationEvent
          onEvent(data)
          if (data.type === 'task_done' || data.type === 'task_failed') {
            reader.cancel(); onDone(); return
          }
        } catch {}
      }
    }
    onDone()
  }).catch(() => onDone())
  return () => controller.abort()
}
