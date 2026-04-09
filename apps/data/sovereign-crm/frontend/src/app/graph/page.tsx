'use client'

import { useState, useEffect } from 'react'
import { Navbar } from '@/components/layout/navbar'
import { API_URL } from '@/lib/api-config'
import Cookies from 'js-cookie'

interface GraphNode {
  id: string
  label: string
  node_type: string
  color?: string
  size: number
  cluster_id?: string
}

interface GraphEdge {
  source: string
  target: string
  edge_type: string
  weight: number
}

interface GraphStats {
  contacts: number
  companies: number
  projects: number
  interactions: number
  edges: number
}

export default function GraphPage() {
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [edges, setEdges] = useState<GraphEdge[]>([])
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) { setLoading(false); return }

    Promise.all([
      fetch(`${API_URL}/api/v1/graph`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/v1/graph/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([graphJson, statsJson]) => {
        const graph = graphJson.data ?? graphJson
        setNodes(graph.nodes ?? [])
        setEdges(graph.edges ?? [])
        setStats(statsJson.data ?? statsJson)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const typeColors: Record<string, string> = {
    contact: '#3b82f6',
    company: '#f59e0b',
    project: '#8b5cf6',
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Relationship Graph</h1>
            <p className="mt-1 text-sm text-muted-foreground">Visualize connections between contacts, companies, and projects.</p>
          </div>
          {stats && (
            <div className="flex gap-4 text-sm">
              <span className="text-blue-400">{stats.contacts} contacts</span>
              <span className="text-amber-400">{stats.companies} companies</span>
              <span className="text-purple-400">{stats.projects} projects</span>
              <span className="text-muted-foreground">{stats.edges} connections</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="mt-8 text-muted-foreground">Loading graph...</div>
        ) : nodes.length === 0 ? (
          <div className="mt-8 text-center text-muted-foreground">
            <p className="text-lg">No graph data yet</p>
            <p className="mt-1 text-sm">Add contacts and companies to see relationships.</p>
          </div>
        ) : (
          <div className="mt-6">
            {/* Legend */}
            <div className="mb-4 flex gap-4 text-xs">
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-full bg-blue-500" /> Contacts</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded bg-amber-500" /> Companies</span>
              <span className="flex items-center gap-1"><span className="h-3 w-3 rounded-sm bg-purple-500 rotate-45" /> Projects</span>
            </div>

            {/* Simple node grid (Cytoscape.js will replace this) */}
            <div className="rounded-lg border bg-muted/10 p-6 min-h-[400px]">
              <div className="flex flex-wrap gap-3">
                {nodes.map(node => (
                  <div key={node.id}
                    className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm"
                    style={{ borderLeftColor: node.color || typeColors[node.node_type] || '#666', borderLeftWidth: 3 }}>
                    <span className={`h-2 w-2 rounded-full`} style={{ backgroundColor: node.color || typeColors[node.node_type] }} />
                    <span>{node.label}</span>
                    <span className="text-[10px] text-muted-foreground">{node.node_type}</span>
                  </div>
                ))}
              </div>

              {edges.length > 0 && (
                <div className="mt-6 text-xs text-muted-foreground">
                  <p className="font-medium mb-2">Connections ({edges.length})</p>
                  <div className="flex flex-wrap gap-2">
                    {edges.slice(0, 20).map((e, i) => {
                      const src = nodes.find(n => n.id === e.source)
                      const tgt = nodes.find(n => n.id === e.target)
                      return (
                        <span key={i} className="rounded bg-muted px-2 py-1">
                          {src?.label ?? '?'} -- {tgt?.label ?? '?'}
                        </span>
                      )
                    })}
                    {edges.length > 20 && <span className="text-muted-foreground">+{edges.length - 20} more</span>}
                  </div>
                </div>
              )}

              <p className="mt-6 text-xs text-muted-foreground text-center">
                Interactive Cytoscape.js graph coming in a future update.
              </p>
            </div>
          </div>
        )}
      </main>
    </>
  )
}
