'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  FileText,
  Link as LinkIcon,
  FileImage,
  FileJson,
  Mic,
  Clapperboard,
} from 'lucide-react';

import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { TrustCheckLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/text', icon: FileText, label: 'Text' },
  { href: '/link', icon: LinkIcon, label: 'Link' },
  { href: '/image', icon: FileImage, label: 'Image' },
  { href: '/document', icon: FileJson, label: 'Document' },
  { href: '/audio', icon: Mic, label: 'Audio' },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <TrustCheckLogo />
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {navItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
             <SidebarMenuItem>
                <SidebarMenuButton
                  disabled
                  tooltip="Coming Soon"
                >
                  <Clapperboard />
                  <span>Live Mode</span>
                </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-4 border-b md:justify-end">
            <SidebarTrigger className="md:hidden" />
            <Button variant="outline" asChild>
                <a href="https://github.com/firebase/studio-extra-samples" target="_blank" rel="noopener noreferrer">
                    View on GitHub
                </a>
            </Button>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
