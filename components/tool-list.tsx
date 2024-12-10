'use client'

import type { Tool } from '@/types/tool'
import { ExternalLink, Github } from 'lucide-react'
import { useEffect, useState } from 'react'
import Search from './search'

export default function ToolList({ initialTools }: { initialTools: Tool[] }) {
  const [tools] = useState<Tool[]>(initialTools)
  const [displayedTools, setDisplayedTools] = useState<Tool[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(1)

  const filterTools = (query: string) => {
    return tools.filter(tool => 
      tool.name.toLowerCase().includes(query.toLowerCase()) ||
      tool.description.toLowerCase().includes(query.toLowerCase())
    )
  }

  useEffect(() => {
    const filtered = filterTools(searchQuery)
    setDisplayedTools(filtered.slice(0, page * 10))
  }, [searchQuery, page, tools])

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setPage(1)
  }

  const handleLoadMore = () => {
    setPage(prevPage => prevPage + 1)
  }

  if (tools.length === 0) {
    return (
      <div className="bg-card rounded-lg border border-border p-4 text-center text-card-foreground">
        No tools found. Check back later for updates.
      </div>
    )
  }

  return (
    <>
      <Search onSearch={handleSearch} />
      <div className="space-y-4 mt-4">
        {displayedTools.map((tool) => (
          <div key={tool.id} className="bg-card rounded-lg border border-border p-4 hover:bg-accent transition-colors">
            <div className="flex items-baseline justify-between mb-2">
              <h3 className="text-lg font-semibold text-primary">
                {tool.name}
              </h3>
              {tool.license && <span className="text-sm text-muted-foreground">{tool.license}</span>}
            </div>
            <p className="text-card-foreground mb-3">{tool.description}</p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <span>Vendor: {tool.vendor}</span>
              <a href={tool.sourceUrl} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary">
                <Github className="w-4 h-4 mr-1" />
                Source
              </a>
              <a href={tool.homepage} target="_blank" rel="noopener noreferrer" className="flex items-center hover:text-primary">
                <ExternalLink className="w-4 h-4 mr-1" />
                Homepage
              </a>
            </div>
            {tool.connections[0]?.configSchema?.properties && (
              <div className="text-sm text-card-foreground">
                <h4 className="font-semibold mb-1">Configuration:</h4>
                <ul className="list-disc list-inside">
                  {Object.entries(tool.connections[0].configSchema.properties).map(([key, value]) => (
                    <li key={key}>
                      {key}: {value?.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
        {displayedTools.length < tools.length && (
          <div className="text-center py-4">
            <button
              onClick={handleLoadMore}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-2 px-4 rounded"
            >
              Load More
            </button>
          </div>
        )}
      </div>
    </>
  )
}

