"use client"

import * as React from "react"
import { CheckIcon, Copy, TerminalIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface CodeBlockProps extends React.HTMLAttributes<HTMLDivElement> {
  code: string
  language?: string
  disableAutoScroll?: boolean
}

export function CodeBlock({ code, language = "bash", className, disableAutoScroll = false, ...props }: CodeBlockProps) {
  const [copied, setCopied] = React.useState(false)
  const [isHovering, setIsHovering] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)

  const copyToClipboard = React.useCallback(() => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [code])

  React.useEffect(() => {
    if (disableAutoScroll) return
    
    const content = contentRef.current
    if (!content) return

    const isOverflowing = content.scrollWidth > content.clientWidth

    if (isOverflowing && isHovering) {
      const duration = Math.max(code.length * 0.08, 2)
      content.style.transition = `transform ${duration}s linear`
      content.style.transform = `translateX(${-(content.scrollWidth - content.clientWidth)}px)`

      return () => {
        content.style.transition = "transform 0.5s ease-out"
        content.style.transform = "translateX(0)"
      }
    }
  }, [isHovering, code, disableAutoScroll])

  return (
    <div
      className={cn("relative rounded-md bg-black text-white py-2 px-3 overflow-hidden flex items-center h-9", className)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
      {...props}
    >
      {/* Terminal icon with fixed width */}
      <div className="flex-shrink-0 w-5 mr-1.5">
        <TerminalIcon className="h-4 w-4 text-gray-400" />
      </div>

      {/* Code content with right padding for copy button */}
      <div className="flex-grow overflow-hidden">
        <div ref={contentRef} className="whitespace-nowrap pr-8 font-mono text-xs">
          {code}
        </div>
      </div>

      {/* Copy button in fixed position */}
      <div className="flex-shrink-0 ml-1">
        <button
          onClick={copyToClipboard}
          className="px-2 py-1 rounded-md transition-colors hover:bg-gray-800 flex items-center gap-1.5"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5 text-green-400" />
              <span className="text-xs text-green-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">Copy</span>
            </>
          )}
        </button>
      </div>
    </div>
  )
}
