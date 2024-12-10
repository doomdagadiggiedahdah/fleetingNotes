import { Anvil } from 'lucide-react'
import ToolList from '@/components/tool-list'
import ErrorMessage from '@/components/error-message'
import { ToolSchema } from '@/types/tool'
import { z } from 'zod'

async function getTools() {
  try {
    const res = await fetch('https://registry.smithery.ai/-/all', {
      next: { revalidate: 3600 } // Revalidate every hour
    })
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }
    
    const data = await res.json()
    const parsedData = z.array(ToolSchema).safeParse(data)
    
    if (!parsedData.success) {
      console.error("Zod parsing error:", parsedData.error)
      throw new Error('Failed to parse tools data')
    }
    
    return parsedData.data
  } catch (error) {
    console.error("Failed to fetch or parse tools:", error)
    throw new Error('Failed to fetch tools. Please try again later.')
  }
}

export default async function Home() {
  let tools
  let error

  try {
    tools = await getTools()
  } catch (e) {
    error = e instanceof Error ? e.message : 'An unexpected error occurred'
  }
  
  return (
    <div className="min-h-screen bg-background">
      <header className="bg-card border-b border-border">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center">
            <Anvil className="w-8 h-8 text-primary mr-2" />
            <h1 className="text-2xl font-bold text-foreground">Smithery</h1>
          </div>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2 text-foreground">Language Model Tool Registry</h2>
          <p className="text-lg text-muted-foreground">
            Discover and integrate powerful tools for your language models
          </p>
        </div>
        {error ? (
          <ErrorMessage message={error} />
        ) : (
          <ToolList initialTools={tools || []} />
        )}
      </main>
    </div>
  )
}

