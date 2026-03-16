"use client"

import Link from "next/link"
import { useDemoHref } from "@/lib/use-demo-href"

interface BreadcrumbItem {
  label: string
  href?: string
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const demoHref = useDemoHref()
  return (
    <nav className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <span>/</span>}
            {isLast || !item.href ? (
              <span className={isLast ? "text-foreground" : ""}>{item.label}</span>
            ) : (
              <Link href={demoHref(item.href)} className="hover:text-foreground transition-colors">
                {item.label}
              </Link>
            )}
          </span>
        )
      })}
    </nav>
  )
}
