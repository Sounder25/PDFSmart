import * as TooltipPrimitive from '@radix-ui/react-tooltip'

export function Tooltip({ children, content }: { children: React.ReactNode; content: string }) {
  if (!content) return <>{children}</>
  return (
    <TooltipPrimitive.Provider delayDuration={400}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            className="bg-[#0f172a] border border-[#334155] text-slate-200 text-xs px-2.5 py-1.5 rounded-md shadow-xl max-w-xs z-[100]"
            sideOffset={4}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-[#334155]" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
