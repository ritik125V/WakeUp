'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Play,
  Trash2,
  RefreshCw,
  Search,
  ChevronRight,
  Layers,
} from 'lucide-react';
import {
  fetchWorkflows,
  createWorkflow,
  deleteWorkflow,
  WorkflowData,
  IWorkflowStepData,
} from '@/lib/api';
import { WorkflowsSkeleton } from '@/components/Skeleton';

export default function WorkflowsPage() {
  const router = useRouter();
  const [workflows, setWorkflows] = useState<WorkflowData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newFlowName, setNewFlowName] = useState<string>('');
  const [newFlowDesc, setNewFlowDesc] = useState<string>('');

  const loadWorkflows = async () => {
    try {
      setLoading(true);
      const res = await fetchWorkflows();
      setWorkflows(res.workflows || []);
    } catch (err) {
      console.error('Failed to load workflows:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('wakeup_auth_token') : null;
    if (!token) {
      router.push('/login');
      return;
    }
    loadWorkflows();
  }, [router]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFlowName.trim()) return;

    try {
      const initialSteps: IWorkflowStepData[] = [
        {
          stepId: `step-${Date.now()}-1`,
          name: '1. User Signup',
          url: 'https://httpbin.org/post',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          queryParams: {},
          bodyPayload: JSON.stringify({ email: 'user@example.com', password: 'secretpassword' }, null, 2),
          expectedStatusCode: 200,
          captureCookies: true,
          carryCookies: true,
          extractVariables: [{ varName: 'userEmail', jsonPath: 'json.email' }],
        },
        {
          stepId: `step-${Date.now()}-2`,
          name: '2. User Login',
          url: 'https://httpbin.org/post',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          queryParams: {},
          bodyPayload: JSON.stringify({ email: '{{userEmail}}', password: 'secretpassword' }, null, 2),
          expectedStatusCode: 200,
          captureCookies: true,
          carryCookies: true,
          extractVariables: [],
        },
      ];

      const res = await createWorkflow({
        name: newFlowName.trim(),
        description: newFlowDesc.trim(),
        steps: initialSteps,
      });

      setNewFlowName('');
      setNewFlowDesc('');
      setIsCreating(false);
      router.push(`/workflows/${res.workflow._id}`);
    } catch (err) {
      console.error('Failed to create workflow:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this workflow?')) return;
    try {
      await deleteWorkflow(id);
      loadWorkflows();
    } catch (err) {
      console.error('Failed to delete workflow:', err);
    }
  };

  const filteredWorkflows = workflows.filter(
    (flow) =>
      flow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (flow.description && flow.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getMethodBadgeClass = (method?: string) => {
    switch (method?.toUpperCase()) {
      case 'POST':
        return 'bg-amber-950/60 text-amber-300';
      case 'PUT':
        return 'bg-blue-950/60 text-blue-300';
      case 'DELETE':
        return 'bg-rose-950/60 text-rose-300';
      default:
        return 'bg-emerald-950/60 text-emerald-300';
    }
  };

  return (
    <div className="min-h-screen bg-black text-neutral-100 px-3.5 sm:px-6 py-4 sm:py-8 font-sans touch-manipulation">
      <div className="max-w-5xl mx-auto space-y-6">
        
        {/* Sleek Minimal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Workflows</h1>
            <p className="text-xs text-neutral-400 mt-0.5">Automate and test multi-step API journeys</p>
          </div>

          <button
            onClick={() => setIsCreating(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-neutral-800 hover:bg-neutral-700 active:bg-neutral-800 text-white font-semibold text-xs rounded-xl transition-all border-none cursor-pointer self-start sm:self-auto shadow-md touch-press"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Create Workflow</span>
          </button>
        </div>

        {/* Minimal Search & Count Bar */}
        <div className="flex items-center justify-between gap-3 bg-neutral-950 p-2.5 rounded-xl">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-neutral-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent text-white pl-9 pr-4 py-1.5 rounded-lg text-xs outline-none placeholder:text-neutral-600 border-none"
            />
          </div>

          <div className="text-xs text-neutral-500 font-mono pr-2 shrink-0">
            {filteredWorkflows.length} {filteredWorkflows.length === 1 ? 'workflow' : 'workflows'}
          </div>
        </div>

        {/* Create Workflow Modal */}
        <AnimatePresence>
          {isCreating && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans"
            >
              <motion.div
                initial={{ scale: 0.96, y: 8 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.96, y: 8 }}
                className="bg-neutral-950 p-6 rounded-2xl max-w-md w-full space-y-5 border-none shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-white">Create Workflow</h3>
                  <button
                    onClick={() => setIsCreating(false)}
                    className="text-neutral-500 hover:text-white text-sm"
                  >
                    ✕
                  </button>
                </div>

                <form onSubmit={handleCreate} className="space-y-4">
                  <div>
                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium">Workflow Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Checkout Journey"
                      value={newFlowName}
                      onChange={(e) => setNewFlowName(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500/50 border-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-neutral-400 block mb-1.5 font-medium font-sans">Description (Optional)</label>
                    <textarea
                      rows={3}
                      placeholder="Brief description of this API test flow..."
                      value={newFlowDesc}
                      onChange={(e) => setNewFlowDesc(e.target.value)}
                      className="w-full bg-neutral-900 text-white px-3.5 py-2 rounded-xl text-xs outline-none focus:ring-1 focus:ring-rose-500/50 border-none"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsCreating(false)}
                      className="px-3.5 py-1.5 bg-neutral-900 text-neutral-300 hover:bg-neutral-850 text-xs font-medium rounded-lg border-none"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs rounded-lg border-none transition-colors"
                    >
                      Create
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Workflows Grid */}
        {loading ? (
          <WorkflowsSkeleton />
        ) : filteredWorkflows.length === 0 ? (
          <div className="p-16 bg-neutral-950 rounded-2xl text-center space-y-3">
            <Layers className="w-8 h-8 text-neutral-600 mx-auto" />
            <h3 className="text-sm font-semibold text-white">
              {searchQuery ? 'No workflows match your search' : 'No workflows yet'}
            </h3>
            <p className="text-xs text-neutral-500 max-w-xs mx-auto">
              Create a workflow to chain multi-step API requests together.
            </p>
            <button
              onClick={() => setIsCreating(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium rounded-lg border-none transition-colors"
            >
              <Plus className="w-4 h-4" /> Create Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredWorkflows.map((flow) => (
              <div
                key={flow._id}
                onClick={() => router.push(`/workflows/${flow._id}`)}
                className="p-5 bg-neutral-950 hover:bg-neutral-900/80 rounded-2xl cursor-pointer transition-all space-y-4 group border-none shadow-md flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white group-hover:text-rose-300 transition-colors">
                      {flow.name}
                    </h3>

                    <button
                      onClick={(e) => handleDelete(flow._id, e)}
                      className="p-1 text-neutral-600 hover:text-rose-400 hover:bg-neutral-900 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                      title="Delete Workflow"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {flow.description && (
                    <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed">
                      {flow.description}
                    </p>
                  )}
                </div>

                {/* Steps Pipeline Badge Strip */}
                {flow.steps && flow.steps.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {flow.steps.slice(0, 5).map((s, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-semibold ${getMethodBadgeClass(s.method)}`}>
                          {s.method}
                        </span>
                        {idx < Math.min(flow.steps.length, 5) - 1 && (
                          <ChevronRight className="w-3 h-3 text-neutral-700" />
                        )}
                      </div>
                    ))}
                    {flow.steps.length > 5 && (
                      <span className="text-[10px] text-neutral-500 font-mono font-medium">
                        +{flow.steps.length - 5}
                      </span>
                    )}
                  </div>
                )}

                {/* Footer Info & Actions */}
                <div className="flex items-center justify-between text-xs text-neutral-500 pt-3 border-t border-neutral-900/60">
                  <span className="font-mono text-[11px]">
                    {flow.steps?.length || 0} {flow.steps?.length === 1 ? 'step' : 'steps'}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/workflows/${flow._id}/report`);
                      }}
                      className="px-2.5 py-1 bg-rose-950/50 hover:bg-rose-900/60 text-rose-300 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 border-none"
                    >
                      <Play className="w-3 h-3 fill-current" /> Run
                    </button>

                    <span className="text-xs font-medium text-neutral-400 group-hover:text-rose-300 transition-colors">
                      Edit →
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
