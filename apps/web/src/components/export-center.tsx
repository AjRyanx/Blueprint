'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileDown, 
  Sparkles, 
  Loader2,
  FileText,
  ListTodo,
  Server,
  Database,
  Shield,
  BookOpen
} from 'lucide-react';
import { toast } from 'sonner';

const API = process.env.NEXT_PUBLIC_API_URL?.replace('localhost', '127.0.0.1');

type ExportCenterProps = {
  projectId: string;
};

export function ExportCenter({ projectId }: ExportCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExportingAll, setIsExportingAll] = useState(false);
  const [downloadingPhase, setDownloadingPhase] = useState<number | null>(null);
  const { data: session } = useSession();
  const token = (session?.user as any)?.accessToken;

  // Helper function to trigger browser file download
  const triggerDownload = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // 1. Export Brief (Phase 1)
  const downloadBrief = async () => {
    try {
      setDownloadingPhase(1);
      const res = await fetch(`${API}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success || !json.data.brief) {
        throw new Error('Project brief has not been generated yet.');
      }
      const p = json.data;
      const b = p.brief;

      const content = `# Project Brief: ${p.name}

## 1. Overview
${p.description || 'No description provided.'}

## 2. One-Line Description
${b.oneLineDescription || ''}

## 3. Problem Statement
${b.problemStatement || ''}

## 4. Target Users
${b.targetUsers || ''}

## 5. Core Value Proposition
${b.coreValueProposition || ''}

## 6. Scope Boundaries
### Out of Scope:
${(b.outOfScope || []).map((x: string) => `* ${x}`).join('\n')}

## 7. Success Metrics
${(b.successMetrics || []).map((x: string) => `* ${x}`).join('\n')}
`;
      triggerDownload(`${p.name.toLowerCase().replace(/\s+/g, '-')}-brief.md`, content);
      toast.success('Project Brief downloaded successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download project brief.');
    } finally {
      setDownloadingPhase(null);
    }
  };

  // 2. Export Requirements (Phase 2)
  const downloadRequirements = async () => {
    try {
      setDownloadingPhase(2);
      const res = await fetch(`${API}/api/v1/projects/${projectId}/requirements`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success || !json.data || json.data.length === 0) {
        throw new Error('No user requirements have been generated yet.');
      }
      
      const pRes = await fetch(`${API}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const pJson = await pRes.json();
      const pName = pJson.data?.name || 'Project';

      const requirements = json.data;
      const musts = requirements.filter((r: any) => r.priority === 'must');
      const shoulds = requirements.filter((r: any) => r.priority === 'should');
      const coulds = requirements.filter((r: any) => r.priority === 'could');
      const wonts = requirements.filter((r: any) => r.priority === 'wont');

      const content = `# User Requirements Specification: ${pName}

This document details the complete functional scope and prioritization of features mapped for development.

## 1. Must Have (Critical Scope)
${musts.length > 0 ? musts.map((r: any) => `* **[${r.status}]** As a user, I want to ${r.userStory}`).join('\n') : '*No critical requirements assigned yet.*'}

## 2. Should Have (High Priority)
${shoulds.length > 0 ? shoulds.map((r: any) => `* **[${r.status}]** As a user, I want to ${r.userStory}`).join('\n') : '*No high priority requirements assigned yet.*'}

## 3. Could Have (Nice to Have)
${coulds.length > 0 ? coulds.map((r: any) => `* **[${r.status}]** As a user, I want to ${r.userStory}`).join('\n') : '*No minor requirements assigned yet.*'}

## 4. Won't Have (Deferred Scope)
${wonts.length > 0 ? wonts.map((r: any) => `* **[${r.status}]** As a user, I want to ${r.userStory}`).join('\n') : '*No deferred requirements assigned yet.*'}
`;
      triggerDownload(`${pName.toLowerCase().replace(/\s+/g, '-')}-requirements.md`, content);
      toast.success('Requirements Specification downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download requirements.');
    } finally {
      setDownloadingPhase(null);
    }
  };

  // 3. Export Architecture (Phase 3)
  const downloadArchitecture = async () => {
    try {
      setDownloadingPhase(3);
      const res = await fetch(`${API}/api/v1/projects/${projectId}/architecture`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success || !json.data || !json.data.components || json.data.components.length === 0) {
        throw new Error('Architecture models have not been completed yet.');
      }
      const arch = json.data;

      const pRes = await fetch(`${API}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const pJson = await pRes.json();
      const pName = pJson.data?.name || 'Project';

      const content = `# Architecture Design Document: ${pName}

## 1. System Components
${arch.components.map((c: any) => `### ${c.name}
* **Type**: ${c.type}
* **Technology**: ${c.technology}
* **Description**: ${c.description}
`).join('\n')}

## 2. Infrastructure & Notes
${arch.notes || 'No infrastructure design notes submitted yet.'}
`;
      triggerDownload(`${pName.toLowerCase().replace(/\s+/g, '-')}-architecture.md`, content);
      toast.success('Architecture Design downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download architecture.');
    } finally {
      setDownloadingPhase(null);
    }
  };

  // 4. Export Schema & Data Model (Phase 4)
  const downloadDataModel = async () => {
    try {
      setDownloadingPhase(4);
      const res = await fetch(`${API}/api/v1/projects/${projectId}/data`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success || !json.data || !json.data.entities || json.data.entities.length === 0) {
        throw new Error('Data models have not been completed yet.');
      }
      const dm = json.data;

      const pRes = await fetch(`${API}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const pJson = await pRes.json();
      const pName = pJson.data?.name || 'Project';

      let content = `# Database & Relationship Schema: ${pName}\n\n`;
      
      content += `## 1. Entities & Fields\n\n`;
      dm.entities.forEach((entity: any) => {
        content += `### ${entity.name}\n`;
        content += `${entity.description ? `*Description: ${entity.description}*\n\n` : ''}`;
        content += `| Field | Type | Required | Unique |\n`;
        content += `| :--- | :--- | :---: | :---: |\n`;
        entity.attributes.forEach((attr: any) => {
          content += `| \`${attr.name}\` | \`${attr.type}\` | ${attr.required ? '✅' : '❌'} | ${attr.unique ? '✅' : '❌'} |\n`;
        });
        content += `\n`;
      });

      content += `## 2. Relationships\n\n`;
      if (dm.relationships && dm.relationships.length > 0) {
        content += `| Relationship | Type | Source Entity | Target Entity |\n`;
        content += `| :--- | :---: | :---: | :---: |\n`;
        dm.relationships.forEach((rel: any) => {
          content += `| ${rel.name} | \`${rel.type}\` | \`${rel.source}\` | \`${rel.target}\` |\n`;
        });
      } else {
        content += `*No database relationships defined yet.*\n`;
      }

      content += `\n## 3. Schema Indexes\n\n`;
      if (dm.indexes && dm.indexes.length > 0) {
        dm.indexes.forEach((idx: any) => {
          content += `* **\`${idx.name}\`**: on Entity \`${idx.entity}\` columns (\`${(idx.columns || []).join(', ')}\`) [Unique: ${idx.unique ? 'Yes' : 'No'}]\n`;
        });
      } else {
        content += `*No custom database indexes configured.*\n`;
      }

      triggerDownload(`${pName.toLowerCase().replace(/\s+/g, '-')}-database-schema.md`, content);
      toast.success('Database Schema downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download data model.');
    } finally {
      setDownloadingPhase(null);
    }
  };

  // 5. Export Security (Phase 5)
  const downloadSecurity = async () => {
    try {
      setDownloadingPhase(5);
      const res = await fetch(`${API}/api/v1/projects/${projectId}/security`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success || !json.data || !json.data.checks || json.data.checks.length === 0) {
        throw new Error('Security checks have not been completed yet.');
      }
      const sec = json.data;

      const pRes = await fetch(`${API}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const pJson = await pRes.json();
      const pName = pJson.data?.name || 'Project';

      const content = `# Security Gates & Scanner: ${pName}

This audit scans system components and evaluates risk compliance vectors.

## 1. Compliance Checklist
${sec.checks.map((c: any) => `* **[${c.status === 'passed' ? 'PASS' : 'WARN'}]** ${c.name}
  *Category: ${c.category}*
  *Description: ${c.description}*
  ${c.recommendation ? `*Mitigation: ${c.recommendation}*` : ''}
`).join('\n')}

## 2. Global Scanner Audit Note
${sec.notes || 'No custom threat vectors reported.'}
`;
      triggerDownload(`${pName.toLowerCase().replace(/\s+/g, '-')}-security-compliance.md`, content);
      toast.success('Security Audit downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download security report.');
    } finally {
      setDownloadingPhase(null);
    }
  };

  // 6. Export Tasks (Phase 6)
  const downloadTasks = async () => {
    try {
      setDownloadingPhase(6);
      const res = await fetch(`${API}/api/v1/projects/${projectId}/tasks`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const json = await res.json();
      if (!json.success || !json.data || json.data.length === 0) {
        throw new Error('Implementation tasks checklist has not been generated yet.');
      }

      const pRes = await fetch(`${API}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const pJson = await pRes.json();
      const pName = pJson.data?.name || 'Project';

      const tasks = json.data;

      const content = `# Implementation Roadmap & Action Plan: ${pName}

This document serves as your stage-by-stage software implementation checklist.

## 1. Phase Tasks Checklist
${tasks.map((t: any) => `* **[${t.status === 'completed' ? 'x' : ' '}] ${t.title}**
  *Complexity: ${t.complexity}*
  *Description: ${t.description}*
`).join('\n')}
`;
      triggerDownload(`${pName.toLowerCase().replace(/\s+/g, '-')}-roadmap.md`, content);
      toast.success('Roadmap Checklist downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to download roadmap tasks.');
    } finally {
      setDownloadingPhase(null);
    }
  };

  // 7. Export Complete Master Plan
  const exportAll = async () => {
    try {
      setIsExportingAll(true);
      
      // Load project details
      const pRes = await fetch(`${API}/api/v1/projects/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include',
      });
      const pJson = await pRes.json();
      if (!pJson.success) throw new Error('Project not found');
      const p = pJson.data;

      let masterMd = `# BLUEPRINT MASTER SYSTEM SPECIFICATION: ${p.name}
      
> Generated programmatically by Blueprint Assistant. All rights reserved.

---

## 1. EXECUTIVE SUMMARY & BRIEF

`;

      if (p.brief) {
        const b = p.brief;
        masterMd += `* **One-Line Pitch**: ${b.oneLineDescription}\n`;
        masterMd += `* **Problem Statement**: ${b.problemStatement}\n`;
        masterMd += `* **Target Users**: ${b.targetUsers}\n`;
        masterMd += `* **Core Value Prop**: ${b.coreValueProposition}\n\n`;
        
        masterMd += `### Scope Boundaries\n`;
        masterMd += `#### Out of Scope:\n`;
        masterMd += `${(b.outOfScope || []).map((x: string) => `* ${x}`).join('\n')}\n\n`;
        
        masterMd += `#### Success Metrics:\n`;
        masterMd += `${(b.successMetrics || []).map((x: string) => `* ${x}`).join('\n')}\n\n`;
      } else {
        masterMd += `*No brief synthesized yet.*\n\n`;
      }

      // Add Phase 2: Requirements
      masterMd += `## 2. FUNCTIONAL USER REQUIREMENTS\n\n`;
      try {
        const rRes = await fetch(`${API}/api/v1/projects/${projectId}/requirements`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const rJson = await rRes.json();
        if (rJson.success && rJson.data && rJson.data.length > 0) {
          const reqs = rJson.data;
          masterMd += `| ID | Status | Requirement User Story |\n`;
          masterMd += `| :---: | :---: | :--- |\n`;
          reqs.forEach((r: any, idx: number) => {
            masterMd += `| R-${idx+1} | \`${r.priority.toUpperCase()}\` | As a user, I want to ${r.userStory} |\n`;
          });
          masterMd += `\n`;
        } else {
          masterMd += `*No user stories assigned.*\n\n`;
        }
      } catch {
        masterMd += `*No requirements found.*\n\n`;
      }

      // Add Phase 3: Architecture
      masterMd += `## 3. SYSTEM ARCHITECTURE DESIGN\n\n`;
      try {
        const aRes = await fetch(`${API}/api/v1/projects/${projectId}/architecture`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const aJson = await aRes.json();
        if (aJson.success && aJson.data && aJson.data.components && aJson.data.components.length > 0) {
          const arch = aJson.data;
          arch.components.forEach((c: any) => {
            masterMd += `### Component: ${c.name}\n`;
            masterMd += `* **Stack**: \`${c.technology}\` (${c.type})\n`;
            masterMd += `* **Details**: ${c.description}\n\n`;
          });
          if (arch.notes) {
            masterMd += `### Architecture Notes\n${arch.notes}\n\n`;
          }
        } else {
          masterMd += `*No system components mapped.*\n\n`;
        }
      } catch {
        masterMd += `*No architecture specification found.*\n\n`;
      }

      // Add Phase 4: Database Model
      masterMd += `## 4. DATABASE & DATA SCHEMAS\n\n`;
      try {
        const dRes = await fetch(`${API}/api/v1/projects/${projectId}/data`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const dJson = await dRes.json();
        if (dJson.success && dJson.data && dJson.data.entities && dJson.data.entities.length > 0) {
          const dm = dJson.data;
          
          dm.entities.forEach((entity: any) => {
            masterMd += `### Entity: ${entity.name}\n`;
            masterMd += `*Description: ${entity.description || 'No description provided.'}*\n\n`;
            masterMd += `| Field | Type | Required | Unique |\n`;
            masterMd += `| :--- | :--- | :---: | :---: |\n`;
            entity.attributes.forEach((attr: any) => {
              masterMd += `| \`${attr.name}\` | \`${attr.type}\` | ${attr.required ? 'Yes' : 'No'} | ${attr.unique ? 'Yes' : 'No'} |\n`;
            });
            masterMd += `\n`;
          });

          if (dm.relationships && dm.relationships.length > 0) {
            masterMd += `### Relationships Map\n\n`;
            masterMd += `| Entity Source | Rel Type | Target Entity | Name |\n`;
            masterMd += `| :---: | :---: | :---: | :--- |\n`;
            dm.relationships.forEach((rel: any) => {
              masterMd += `| \`${rel.source}\` | \`${rel.type}\` | \`${rel.target}\` | ${rel.name} |\n`;
            });
            masterMd += `\n`;
          }
        } else {
          masterMd += `*No database model declared.*\n\n`;
        }
      } catch {
        masterMd += `*No database schema found.*\n\n`;
      }

      // Add Phase 5: Security Report
      masterMd += `## 5. SECURITY & COMPLIANCE SCAN\n\n`;
      try {
        const sRes = await fetch(`${API}/api/v1/projects/${projectId}/security`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const sJson = await sRes.json();
        if (sJson.success && sJson.data && sJson.data.checks && sJson.data.checks.length > 0) {
          const sec = sJson.data;
          sec.checks.forEach((c: any) => {
            masterMd += `* **[${c.status.toUpperCase()}]** ${c.name} (${c.category})\n`;
            masterMd += `  *Description*: ${c.description}\n`;
            if (c.recommendation) {
              masterMd += `  *Mitigation*: ${c.recommendation}\n`;
            }
            masterMd += `\n`;
          });
        } else {
          masterMd += `*No security scans processed.*\n\n`;
        }
      } catch {
        masterMd += `*No security analysis found.*\n\n`;
      }

      // Add Phase 6: Tasks
      masterMd += `## 6. IMPLEMENTATION ROADMAP\n\n`;
      try {
        const tRes = await fetch(`${API}/api/v1/projects/${projectId}/tasks`, {
          headers: { Authorization: `Bearer ${token}` },
          credentials: 'include',
        });
        const tJson = await tRes.json();
        if (tJson.success && tJson.data && tJson.data.length > 0) {
          const tasks = tJson.data;
          tasks.forEach((t: any, idx: number) => {
            masterMd += `* [${t.status === 'completed' ? 'x' : ' '}] **T-${idx+1}: ${t.title}** (${t.complexity} Complexity)\n`;
            masterMd += `  *Description*: ${t.description}\n\n`;
          });
        } else {
          masterMd += `*No implementation roadmap tasks configured.*\n\n`;
        }
      } catch {
        masterMd += `*No execution blueprint roadmap found.*\n\n`;
      }

      triggerDownload(`${p.name.toLowerCase().replace(/\s+/g, '-')}-master-blueprint.md`, masterMd);
      toast.success('Master Blueprint specification compiled and downloaded!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to export master document.');
    } finally {
      setIsExportingAll(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="font-medium text-xs tracking-wide border-border/60 hover:bg-accent/40 rounded-lg gap-1.5 h-9 bg-background/30 backdrop-blur-sm"
        >
          <FileDown className="h-4 w-4 text-primary" />
          <span>Export Center</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl border-border/80 bg-background/95 backdrop-blur-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <DialogTitle className="text-xl font-bold tracking-tight">Download Center</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-light">
            Generate and download clean, production-grade Markdown documents for each software development stage.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4 md:grid-cols-2">
          {/* Phase 1 */}
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-primary" /> Brief Specifications
                </CardTitle>
                <CardDescription className="text-[10px]">Phase 1 Synthesized Brief</CardDescription>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase">Phase 1</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 text-[11px] rounded-lg mt-2 gap-1.5"
                onClick={downloadBrief}
                disabled={downloadingPhase !== null || isExportingAll}
              >
                {downloadingPhase === 1 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download brief.md
              </Button>
            </CardContent>
          </Card>

          {/* Phase 2 */}
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <FileText className="h-4 w-4 text-primary" /> Requirements Specs
                </CardTitle>
                <CardDescription className="text-[10px]">Phase 2 Prioritized Stories</CardDescription>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase">Phase 2</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 text-[11px] rounded-lg mt-2 gap-1.5"
                onClick={downloadRequirements}
                disabled={downloadingPhase !== null || isExportingAll}
              >
                {downloadingPhase === 2 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download requirements.md
              </Button>
            </CardContent>
          </Card>

          {/* Phase 3 */}
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Server className="h-4 w-4 text-primary" /> Architecture Design
                </CardTitle>
                <CardDescription className="text-[10px]">Phase 3 Component Details</CardDescription>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase">Phase 3</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 text-[11px] rounded-lg mt-2 gap-1.5"
                onClick={downloadArchitecture}
                disabled={downloadingPhase !== null || isExportingAll}
              >
                {downloadingPhase === 3 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download architecture.md
              </Button>
            </CardContent>
          </Card>

          {/* Phase 4 */}
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Database className="h-4 w-4 text-primary" /> Database Schemas
                </CardTitle>
                <CardDescription className="text-[10px]">Phase 4 Data Model Maps</CardDescription>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase">Phase 4</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 text-[11px] rounded-lg mt-2 gap-1.5"
                onClick={downloadDataModel}
                disabled={downloadingPhase !== null || isExportingAll}
              >
                {downloadingPhase === 4 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download schemas.md
              </Button>
            </CardContent>
          </Card>

          {/* Phase 5 */}
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <Shield className="h-4 w-4 text-primary" /> Security Scan Audit
                </CardTitle>
                <CardDescription className="text-[10px]">Phase 5 Gate Scan Results</CardDescription>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase">Phase 5</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 text-[11px] rounded-lg mt-2 gap-1.5"
                onClick={downloadSecurity}
                disabled={downloadingPhase !== null || isExportingAll}
              >
                {downloadingPhase === 5 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download security.md
              </Button>
            </CardContent>
          </Card>

          {/* Phase 6 */}
          <Card className="border-border/40 bg-card/30 backdrop-blur-sm hover:border-primary/20 transition-all duration-300">
            <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
              <div className="space-y-0.5">
                <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                  <ListTodo className="h-4 w-4 text-primary" /> Implementation Roadmap
                </CardTitle>
                <CardDescription className="text-[10px]">Phase 6 Action Checklist</CardDescription>
              </div>
              <Badge variant="outline" className="text-[9px] uppercase">Phase 6</Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <Button
                variant="secondary"
                size="sm"
                className="w-full h-8 text-[11px] rounded-lg mt-2 gap-1.5"
                onClick={downloadTasks}
                disabled={downloadingPhase !== null || isExportingAll}
              >
                {downloadingPhase === 6 ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
                Download roadmap.md
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Export All Action */}
        <div className="border-t border-border/40 pt-4 mt-2 flex flex-col items-center">
          <Button
            className="w-full h-11 text-xs font-semibold rounded-xl gap-2 shadow-lg shadow-primary/10 transition-all bg-primary hover:bg-primary/95 text-primary-foreground duration-300"
            onClick={exportAll}
            disabled={downloadingPhase !== null || isExportingAll}
          >
            {isExportingAll ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4" />
            )}
            Compile & Export Master Blueprint Document (All Stages)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
