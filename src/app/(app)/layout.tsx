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

const BottomNavBar = () => {
  const pathname = usePathname();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t z-10">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex flex-col items-center justify-center w-full h-full text-xs gap-1',
              pathname === item.href ? 'text-primary' : 'text-muted-foreground'
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

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
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
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
            <div className="md:hidden">
              <TrustCheckLogo />
            </div>
            <Button variant="outline" asChild>
                <a href="https://github.com/firebase/studio-extra-samples" target="_blank" rel="noopener noreferrer">
                    View on GitHub
                </a>
            </Button>
        </header>
        <main className="p-4 md:p-8 pb-20 md:pb-8">{children}</main>
      </SidebarInset>
      <BottomNavBar />
    </SidebarProvider>
  );
}
