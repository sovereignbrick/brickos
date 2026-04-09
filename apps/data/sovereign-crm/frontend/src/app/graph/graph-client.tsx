'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import cytoscape from 'cytoscape'
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

const TYPE_COLORS: Record<string, string> = {
  contact: '#3b82f6',
  company: '#f59e0b',
  project: '#8b5cf6',
}

const TYPE_SHAPES: Record<string, string> = {
  contact: 'ellipse',
  company: 'round-rectangle',
  project: 'diamond',
}

export default function GraphClient() {
  const containerRef = useRef<HTMLDivElement>(null)
  const cyRef = useRef<cytoscape.Core | null>(null)
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<GraphNode | null>(null)

  const initGraph = useCallback((nodes: GraphNode[], edges: GraphEdge[]) => {
    if (!containerRef.current) return

    // Destroy previous instance
    if (cyRef.current) cyRef.current.destroy()

    const elements: cytoscape.ElementDefinition[] = []

    // Add nodes
    for (const node of nodes) {
      elements.push({
        data: {
          id: node.id,
          label: node.label,
          nodeType: node.node_type,
          color: node.color || TYPE_COLORS[node.node_type] || '#666',
          nodeSize: Math.max(20, Math.min(60, 20 + node.size * 3)),
        },
      })
    }

    // Add edges
    for (const edge of edges) {
      // Only add if both source and target exist
      if (nodes.some(n => n.id === edge.source) && nodes.some(n => n.id === edge.target)) {
        elements.push({
          data: {
            source: edge.source,
            target: edge.target,
            edgeType: edge.edge_type,
            weight: edge.weight,
          },
        })
      }
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            'background-color': 'data(color)',
            'label': 'data(label)',
            'color': '#fafafa',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '10px',
            'text-margin-y': 6,
            'width': 'data(nodeSize)',
            'height': 'data(nodeSize)',
            'border-width': 2,
            'border-color': '#27272a',
            'text-outline-width': 2,
            'text-outline-color': '#09090b',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node[nodeType="company"]',
          style: {
            'shape': 'round-rectangle',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node[nodeType="project"]',
          style: {
            'shape': 'diamond',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'node:selected',
          style: {
            'border-width': 3,
            'border-color': '#22d3ee',
          } as cytoscape.Css.Node,
        },
        {
          selector: 'edge',
          style: {
            'width': 1,
            'line-color': '#3f3f46',
            'curve-style': 'bezier',
            'opacity': 0.6,
          } as cytoscape.Css.Edge,
        },
        {
          selector: 'edge[edgeType="member_of"]',
          style: {
            'line-color': '#f59e0b',
            'width': 2,
          } as cytoscape.Css.Edge,
        },
        {
          selector: 'edge[edgeType="assigned_to"]',
          style: {
            'line-color': '#8b5cf6',
            'line-style': 'dashed',
          } as cytoscape.Css.Edge,
        },
      ],
      layout: {
        name: 'cose',
        animate: true,
        animationDuration: 800,
        nodeRepulsion: () => 8000,
        idealEdgeLength: () => 100,
        gravity: 0.25,
        padding: 40,
      } as cytoscape.CoseLayoutOptions,
      minZoom: 0.3,
      maxZoom: 3,
      wheelSensitivity: 0.3,
    })

    // Click handler
    cy.on('tap', 'node', (evt) => {
      const data = evt.target.data()
      setSelected({
        id: data.id,
        label: data.label,
        node_type: data.nodeType,
        color: data.color,
        size: data.nodeSize,
      })
    })

    cy.on('tap', (evt) => {
      if (evt.target === cy) setSelected(null)
    })

    cyRef.current = cy
  }, [])

  useEffect(() => {
    const token = Cookies.get('auth_token')
    if (!token) { setLoading(false); return }

    Promise.all([
      fetch(`${API_URL}/api/v1/graph`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${API_URL}/api/v1/graph/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    ])
      .then(([graphJson, statsJson]) => {
        const graph = graphJson.data ?? graphJson
        setStats(statsJson.data ?? statsJson)
        initGraph(graph.nodes ?? [], graph.edges ?? [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [initGraph])

  const handleFit = () => cyRef.current?.fit(undefined, 40)
  const handleCenter = () => cyRef.current?.center()

  const handleNavigate = () => {
    if (!selected) return
    const prefix = selected.node_type === 'company' ? 'companies' : `${selected.node_type}s`
    window.location.href = `/${prefix}/${selected.id}`
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-full px-4 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-semibold">Relationship Graph</h1>
            {stats && (
              <div className="flex gap-4 text-xs mt-1">
                <span className="text-blue-400">{stats.contacts} contacts</span>
                <span className="text-amber-400">{stats.companies} companies</span>
                <span className="text-purple-400">{stats.projects} projects</span>
                <span className="text-muted-foreground">{stats.edges} connections</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleFit}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Fit
            </button>
            <button onClick={handleCenter}
              className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted transition-colors">
              Center
            </button>
          </div>
        </div>

        {/* Legend */}
        <div className="flex gap-4 text-xs mb-2">
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-blue-500" /> Contacts
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded bg-amber-500" /> Companies
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm bg-purple-500" style={{ transform: 'rotate(45deg)' }} /> Projects
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-px bg-amber-500 inline-block" style={{ width: 12, height: 2 }} /> Member of
          </span>
          <span className="flex items-center gap-1">
            <span className="h-px bg-purple-500 inline-block" style={{ width: 12, height: 2, borderTop: '2px dashed #8b5cf6' }} /> Assigned to
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-[600px] text-muted-foreground">Loading graph...</div>
        ) : (
          <div className="relative">
            {/* Cytoscape container */}
            <div
              ref={containerRef}
              className="w-full rounded-lg border bg-[#0a0a0b]"
              style={{ height: '600px' }}
            />

            {/* Selected node info panel */}
            {selected && (
              <div className="absolute bottom-4 left-4 rounded-lg border bg-popover p-4 shadow-xl max-w-xs">
                <div className="flex items-center gap-2 mb-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: selected.color }} />
                  <span className="font-medium">{selected.label}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px]">{selected.node_type}</span>
                </div>
                <button onClick={handleNavigate}
                  className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500">
                  Open Detail
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </>
  )
}
