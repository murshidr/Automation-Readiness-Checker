import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowRight, CheckCircle, BarChart2, Plus, Trash2, Download, Globe,
  HelpCircle, ChevronRight, Activity, Clock, Database, Brain, Layers, Pencil, Share2, User as UserIcon, LogOut
} from 'lucide-react';

import { Button, Card, Input, Label, Select, Badge } from './components/ui';
import { cn } from './components/ui';
import { FREQUENCY_LABELS, DEPARTMENTS, DATA_INPUT_OPTIONS, DATA_OUTPUT_OPTIONS } from './constants';
import { Frequency, TaskInput, AutomationCategory, TaskScore, AssessmentSession } from './types';
import {
  getSession,
  getSessionsList,
  getCurrentSessionId,
  setCurrentSession,
  createNewSession,
  addTaskToSession,
  updateTaskInSession,
  removeTaskFromSession,
  clearSession,
  saveSession,
  getHourlyRate,
  setHourlyRate,
  getScoringWeights,
  setScoringWeights,
  updateScoreInsight,
  isSupabaseConfigured,
  getSessionAsync,
  getSessionsListAsync,
  createNewSessionAsync,
  setCurrentSessionAsync,
  addTaskToSessionAsync,
  updateTaskInSessionAsync,
  removeTaskFromSessionAsync,
  clearSessionAsync,
  updateScoreInsightAsync
} from './services/storageService';
import { exportToCSV, exportToJSON, exportToPDF } from './services/exportService';
// import { enhanceWithGemini } from './services/geminiService'; // Kept for future use
import { enhanceWithGroq } from './services/groqservice';
import { estimateMonthlyValue, estimateMonthlyTimeSaved } from './utils/roi';
import { scoreTask } from './services/scoringEngine';
import type { ScoringWeights } from './services/scoringEngine';
import { AuthProvider, useAuth } from './components/AuthContext';

const EMPTY_SESSION: AssessmentSession = {
  token: '',
  createdAt: '',
  tasks: [],
  scores: {}
};

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Login Required</h2>
        <p className="text-slate-600 mb-6">You must be logged in to access this page.</p>
        <Button onClick={() => navigate('/')}>Go to Login</Button>
      </div>
    );
  }

  return children;
};

// --- Landing Page ---


const LandingPage = () => {
  const navigate = useNavigate();
  const [demoOpen, setDemoOpen] = useState(false);
  const { user, signInWithGoogle, signOut } = useAuth();

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
          <img src="/logo-primary.svg" className="h-9 w-9 transition-transform group-hover:scale-110" alt="Flowtimize Logo" />
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">Flowtimize</span>
        </div>
        <div className="space-x-4 flex items-center">
          {user ? (
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600 hidden md:inline">{user.email}</span>
              <Button variant="ghost" onClick={signOut} size="sm">
                Log Out
              </Button>
              <Button onClick={() => navigate('/assess')}>Dashboard</Button>
            </div>
          ) : (
            <>
              <Button variant="ghost" onClick={signInWithGoogle} aria-label="Log in">Log In</Button>
              <Button onClick={() => navigate('/assess')} aria-label="Get started">Get Started</Button>
            </>
          )}
        </div>
      </nav>

      <main className="flex-grow">
        <section className="py-20 px-6 text-center max-w-5xl mx-auto flex flex-col items-center">
          <img src="/logo-hero.svg" className="h-32 w-32 mb-8 animate-pulse shadow-2xl rounded-[40px]" alt="Flowtimize Hero Logo" />
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 mb-6 tracking-tight leading-[1.1]">
            Find where your business is <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">losing time and money</span> — and automate it
          </h1>
          <p className="text-xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed">
            Stop wasting hours on manual work. Discover exactly what to automate in minutes. <strong>Flowtimize</strong> scores your business activities and suggests the right tools in seconds.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Button size="lg" onClick={() => navigate('/assess')} className="gap-2" aria-label="Start assessment">
              Start Assessment <ArrowRight className="h-4 w-4" aria-hidden />
            </Button>
            <Button size="lg" variant="outline" className="gap-2" onClick={() => setDemoOpen(true)} aria-label="Watch demo">
              Watch Demo
            </Button>
          </div>
        </section>

        <section className="py-16 bg-white border-y border-slate-200">
          <div className="max-w-6xl mx-auto px-6 grid md:grid-cols-3 gap-8">
            {[
              { icon: <Database className="h-8 w-8 text-blue-500" />, title: "1. Submit Tasks", desc: "Describe your daily workflows and data inputs in simple terms." },
              { icon: <Brain className="h-8 w-8 text-purple-500" />, title: "2. AI Analysis", desc: "Our engine scores tasks based on frequency, complexity, and rules." },
              { icon: <BarChart2 className="h-8 w-8 text-green-500" />, title: "3. Get Insights", desc: "Receive a prioritized roadmap of what to automate first." }
            ].map((feature, i) => (
              <div key={i} className="flex flex-col items-center text-center p-6">
                <div className="bg-slate-50 p-4 rounded-full mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-600">{feature.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      {demoOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-title"
          onClick={() => setDemoOpen(false)}
        >
          <Card
            className="max-w-4xl w-full overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="bg-slate-900 flex justify-between items-center p-4">
              <h2 id="demo-title" className="text-lg font-bold text-white">Watch Tutorial</h2>
              <Button variant="ghost" size="sm" onClick={() => setDemoOpen(false)} className="text-white hover:bg-slate-800">
                ×
              </Button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src="/videos/tutorial.mp4"
                controls
                autoPlay
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>
            <div className="p-4 bg-white border-t border-slate-200 flex justify-end">
              <Button onClick={() => { setDemoOpen(false); navigate('/assess'); }}>
                Start My Assessment
              </Button>
            </div>
          </Card>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-12 px-6 text-center">
        <div className="flex items-center justify-center space-x-2 mb-6 opacity-80">
          <img src="/logo-primary.svg" className="h-6 w-6 grayscale brightness-200" alt="Flowtimize logo" />
          <span className="font-bold text-white tracking-tight">Flowtimize</span>
        </div>
        <p className="mb-2">© 2026 Flowtimize. All rights reserved.</p>
        <p>Contact us: <a href="mailto:quantumstackslabs@gmail.com" className="text-blue-400 hover:text-blue-300 transition-colors">quantumstackslabs@gmail.com</a></p>
      </footer>
    </div>
  );
};

// --- Assessment (Task Input) Page ---

const AssessmentPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const editTaskId = (location.state as { editTaskId?: string } | null)?.editTaskId;
  const [session, setSession] = useState<AssessmentSession>(
    isSupabaseConfigured ? EMPTY_SESSION : getSession()
  );
  const [sessionsList, setSessionsList] = useState(getSessionsList());
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSessionAsync()
      .then(setSession)
      .then(() => getSessionsListAsync().then(setSessionsList))
      .finally(() => setSessionLoading(false));
  }, []);

  // Form State
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [dept, setDept] = useState(DEPARTMENTS[0]);
  const [customDept, setCustomDept] = useState('');
  const [showCustomDept, setShowCustomDept] = useState(false);
  const [freq, setFreq] = useState<Frequency>(Frequency.ManyTimesDaily);
  const [time, setTime] = useState(15);
  const [inputs, setInputs] = useState<string[]>([]);
  const [outputs, setOutputs] = useState<string[]>([]);

  // Load task into form when editing
  useEffect(() => {
    if (editTaskId && session.tasks.length >= 0) {
      const task = session.tasks.find(t => t.id === editTaskId);
      if (task) {
        setName(task.name);
        setDesc(task.description);

        if (DEPARTMENTS.includes(task.department)) {
          setDept(task.department);
          setCustomDept('');
          setShowCustomDept(false);
        } else {
          setDept('Other');
          setCustomDept(task.department);
          setShowCustomDept(true);
        }

        setFreq(task.frequency);
        setTime(task.timePerTask);
        setInputs([...task.inputs]);
        setOutputs([...task.outputs]);
      }
    }
  }, [editTaskId, session.tasks]);

  const handleInputToggle = (option: string) => {
    setInputs(prev => prev.includes(option) ? prev.filter(i => i !== option) : [...prev, option]);
  };
  const handleOutputToggle = (option: string) => {
    setOutputs(prev => prev.includes(option) ? prev.filter(i => i !== option) : [...prev, option]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const taskPayload: TaskInput = {
      id: editTaskId || uuidv4(),
      name,
      description: desc,
      department: dept === 'Other' ? customDept : dept,
      frequency: freq,
      timePerTask: time,
      inputs: inputs,
      outputs: outputs
    };

    const delay = isSupabaseConfigured ? 0 : 600;
    setTimeout(async () => {
      try {
        const updatedSession = isSupabaseConfigured
          ? editTaskId
            ? await updateTaskInSessionAsync(editTaskId, taskPayload)
            : await addTaskToSessionAsync(taskPayload)
          : editTaskId
            ? updateTaskInSession(editTaskId, taskPayload)
            : addTaskToSession(taskPayload);
        setSession(updatedSession);
        if (isSupabaseConfigured) setSessionsList(await getSessionsListAsync());
      } finally {
        setName('');
        setDesc('');
        setInputs([]);
        setOutputs([]);
        setIsSubmitting(false);
        navigate('/assess', { replace: true, state: {} });
        window.scrollTo(0, 0);
      }
    }, delay);
  };

  const handleCancelEdit = () => {
    setName('');
    setDesc('');
    setInputs([]);
    setOutputs([]);
    navigate('/assess', { replace: true, state: {} });
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex-shrink-0">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center space-x-3 group cursor-pointer" onClick={() => navigate('/')}>
            <img src="/logo-primary.svg" className="h-7 w-7 transition-transform group-hover:scale-110" alt="Flowtimize Logo" />
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">Flowtimize</span>
          </div>
        </div>
        <nav className="p-4 space-y-1">
          <Button variant="ghost" className="w-full justify-start font-semibold bg-blue-50 text-blue-700">
            <Plus className="mr-2 h-4 w-4" /> Add Tasks
          </Button>
          <Button variant="ghost" className="w-full justify-start" onClick={() => navigate('/results')}>
            <BarChart2 className="mr-2 h-4 w-4" /> View Results
            {session.tasks.length > 0 && <Badge className="ml-auto" variant="default">{session.tasks.length}</Badge>}
          </Button>
          {session.tasks.length > 0 && (
            <Button
              variant="ghost"
              className="w-full justify-start text-slate-500 hover:text-red-600"
              onClick={async () => {
                if (isSupabaseConfigured) {
                  const s = await clearSessionAsync();
                  setSession(s);
                  setSessionsList(await getSessionsListAsync());
                } else {
                  clearSession();
                  setSession(getSession());
                  setSessionsList(getSessionsList());
                }
                navigate('/assess');
              }}
              aria-label="Clear session and start over"
            >
              <Trash2 className="mr-2 h-4 w-4" /> Clear session
            </Button>
          )}
        </nav>
        <div className="p-4 space-y-3 border-t border-slate-200">
          <div>
            <Label className="text-xs text-slate-500">Assessment</Label>
            <Select
              value={getCurrentSessionId() || ''}
              onChange={async e => {
                const id = e.target.value;
                if (id === '__new__') {
                  if (isSupabaseConfigured) {
                    setSession(await createNewSessionAsync());
                    setSessionsList(await getSessionsListAsync());
                  } else {
                    setSession(createNewSession());
                    setSessionsList(getSessionsList());
                  }
                } else {
                  if (isSupabaseConfigured) {
                    const next = await setCurrentSessionAsync(id);
                    if (next) setSession(next);
                    setSessionsList(await getSessionsListAsync());
                  } else {
                    const next = setCurrentSession(id);
                    if (next) setSession(next);
                    setSessionsList(getSessionsList());
                  }
                }
              }}
              className="mt-1"
              aria-label="Switch assessment"
            >
              {sessionsList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
              <option value="__new__">+ New assessment</option>
            </Select>
          </div>
        </div>
        <div className="p-4 mt-auto">
          <div className="bg-slate-100 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Progress</h4>
            <div className="w-full bg-slate-200 rounded-full h-2 mb-2">
              <div className="bg-blue-600 h-2 rounded-full" style={{ width: `${Math.min(100, session.tasks.length * 20)}%` }}></div>
            </div>
            <p className="text-xs text-slate-500">{session.tasks.length} tasks flowtimized</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6 md:p-12 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">{editTaskId ? 'Edit Task' : 'Add a Business Task'}</h1>
              <p className="text-slate-600">{editTaskId ? 'Update the task details below.' : 'Describe a repetitive task to check its automation potential.'}</p>
            </div>
            {editTaskId && (
              <Button type="button" variant="outline" onClick={handleCancelEdit} aria-label="Cancel edit">
                Cancel
              </Button>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <Card className="p-6 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="taskName">Task Name</Label>
                <Input
                  id="taskName"
                  placeholder="e.g., Process Monthly Invoices"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="desc">Description <span className="text-slate-400 font-normal">(Be specific about steps)</span></Label>
                <textarea
                  id="desc"
                  className="flex min-h-[100px] w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., I download the PDF from email, copy the amount to Excel, and verify the PO number..."
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="dept">Department</Label>
                  <Select
                    id="dept"
                    value={dept}
                    onChange={e => {
                      const val = e.target.value;
                      setDept(val);
                      if (val === 'Other') {
                        setShowCustomDept(true);
                      } else {
                        setShowCustomDept(false);
                      }
                    }}
                  >
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>

                  {showCustomDept && (
                    <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-md animate-in fade-in slide-in-from-top-1">
                      <Label htmlFor="customDept" className="text-xs text-blue-700 mb-1 block">Specify Department</Label>
                      <Input
                        id="customDept"
                        placeholder="e.g., Legal, Research..."
                        value={customDept}
                        onChange={e => setCustomDept(e.target.value)}
                        className="bg-white border-blue-300 focus:ring-blue-500"
                        autoFocus
                        required={dept === 'Other'}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freq">Frequency</Label>
                  <Select id="freq" value={freq} onChange={e => setFreq(e.target.value as Frequency)}>
                    {Object.entries(FREQUENCY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timePerTask">Time per task (minutes)</Label>
                  <Input
                    id="timePerTask"
                    type="number"
                    min={1}
                    max={480}
                    value={time}
                    onChange={e => setTime(Number(e.target.value) || 15)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data Inputs <span className="text-slate-400 font-normal">(Select all that apply)</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DATA_INPUT_OPTIONS.map(opt => (
                    <label key={opt} className={cn(
                      "flex items-center space-x-2 border rounded-md p-3 cursor-pointer transition-all",
                      inputs.includes(opt) ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    )}>
                      <input
                        type="checkbox"
                        checked={inputs.includes(opt)}
                        onChange={() => handleInputToggle(opt)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Data Outputs <span className="text-slate-400 font-normal">(Select all that apply)</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DATA_OUTPUT_OPTIONS.map(opt => (
                    <label key={opt} className={cn(
                      "flex items-center space-x-2 border rounded-md p-3 cursor-pointer transition-all",
                      outputs.includes(opt) ? "border-blue-500 bg-blue-50" : "border-slate-200 hover:border-slate-300"
                    )}>
                      <input
                        type="checkbox"
                        checked={outputs.includes(opt)}
                        onChange={() => handleOutputToggle(opt)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            </Card>

            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <span className="text-sm text-slate-500">
                {session.tasks.length > 0 ? `${session.tasks.length} tasks flowtimized` : 'Start with your first task'}
              </span>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {session.tasks.length > 0 && (
                  <Button type="button" variant="outline" onClick={() => navigate('/results')} className="flex-1 sm:flex-none">
                    Skip to Results
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting} className="flex-1 sm:flex-none">
                  {isSubmitting ? 'Analyzing...' : editTaskId ? 'Update Task' : 'Analyze Task'}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

// --- Results Dashboard ---

const ResultsPage = () => {
  const navigate = useNavigate();
  const [session, setSession] = useState<AssessmentSession>(
    isSupabaseConfigured ? EMPTY_SESSION : getSession()
  );
  const [sessionLoading, setSessionLoading] = useState(isSupabaseConfigured);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [hourlyRate, setHourlyRateState] = useState<number | null>(getHourlyRate());
  const [showSettings, setShowSettings] = useState(false);
  const [weights, setWeightsState] = useState<ScoringWeights>(getScoringWeights());
  const [enhancingTaskId, setEnhancingTaskId] = useState<string | null>(null);
  const [enhanceErrorTaskId, setEnhanceErrorTaskId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    getSessionAsync()
      .then(s => {
        console.log('ResultsPage session loaded:', s.tasks.length, 'tasks,', Object.keys(s.scores).length, 'scores');
        setSession(s);
      })
      .finally(() => setSessionLoading(false));
  }, []);

  const scores: TaskScore[] = session.tasks.map(task => {
    // Return existing score if present, otherwise calculate it on the fly
    return session.scores[task.id] || scoreTask(task, weights);
  });

  const potentialSavings = hourlyRate != null && hourlyRate > 0
    ? scores.reduce((acc, curr) => {
      const task = session.tasks.find(t => t.id === curr.taskId);
      if (!task) return acc;
      return acc + estimateMonthlyValue(
        { timePerTask: task.timePerTask, frequency: task.frequency, finalScore: curr.finalScore },
        hourlyRate
      );
    }, 0)
    : scores.reduce((acc, curr) => acc + curr.finalScore * 15, 0);

  // Calculate total time saved
  const totalTimeSaved = scores.reduce((acc, curr) => {
    const task = session.tasks.find(t => t.id === curr.taskId);
    if (!task) return acc;
    return acc + estimateMonthlyTimeSaved(
      { timePerTask: task.timePerTask, frequency: task.frequency, finalScore: curr.finalScore }
    );
  }, 0);

  const stats = {
    total: scores.length,
    fully: scores.filter(s => s.category === AutomationCategory.FullyAutomatable).length,
    partially: scores.filter(s => s.category === AutomationCategory.PartiallyAutomatable).length,
    potentialSavings,
    totalTimeSaved
  };

  const chartData = scores.map((s, index) => {
    const task = session.tasks.find(t => t.id === s.taskId);
    return {
      name: (task?.name || 'Unknown').substring(0, 10) + '...',
      score: s.finalScore,
      category: s.category
    };
  });

  const getScoreColor = (score: number) => {
    if (score >= 80) return '#10B981';
    if (score >= 40) return '#F59E0B';
    return '#EF4444';
  };

  let filteredScores = selectedCategory === 'all'
    ? scores
    : scores.filter(s => s.category === selectedCategory);
  if (selectedDepartment !== 'all') {
    filteredScores = filteredScores.filter(s => {
      const task = session.tasks.find(t => t.id === s.taskId);
      return task?.department === selectedDepartment;
    });
  }

  const handleExportCSV = () => exportToCSV(session);
  const handleExportJSON = () => exportToJSON(session);

  const handleCopySummary = async () => {
    const lines = [
      `Flowtimize – Intelligent Automation Diagnostics (${new Date().toLocaleDateString()})`,
      `Total tasks: ${stats.total} | Fully automatable: ${stats.fully} | Partially: ${stats.partially}`,
      `Est. monthly value: $${Math.round(stats.potentialSavings).toLocaleString()}`,
      '',
      ...scores.map(s => {
        const task = session.tasks.find(t => t.id === s.taskId);
        return task ? `${task.name}: ${s.finalScore}/100 (${s.category})` : '';
      }).filter(Boolean)
    ];
    const text = lines.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch {
      setCopySuccess(false);
    }
  };

  if (sessionLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600">Loading...</p>
      </div>
    );
  }

  if (session.tasks.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No tasks added yet</h2>
          <p className="text-slate-600 mb-6">Start by adding some tasks to see your automation potential.</p>
          <Button onClick={() => navigate('/assess')}>Add Your First Task</Button>
        </div>
      </div>
    );
  }
  // Dynamically get unique departments from tasks
  const availableDepartments = Array.from(new Set([
    ...DEPARTMENTS.filter(d => d !== 'Other'),
    ...session.tasks.map(t => t.department)
  ])).filter(Boolean).sort() as string[];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row justify-between items-center sticky top-0 z-10 shadow-sm gap-4">
        <div className="flex items-center space-x-3 group cursor-pointer w-full md:w-auto overflow-hidden" onClick={() => navigate('/')}>
          <img src="/logo-primary.svg" className="h-8 w-8 transition-transform group-hover:scale-110 flex-shrink-0" alt="Flowtimize Logo" />
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight truncate">Flowtimize</span>
        </div>
        <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto scrollbar-hide no-scrollbar">
          <Button variant="outline" size="sm" onClick={() => navigate('/assess')} className="whitespace-nowrap flex-shrink-0">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> Add More
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV} className="whitespace-nowrap flex-shrink-0">
            <Download className="mr-1.5 h-3.5 w-3.5" /> CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToPDF(session)} className="whitespace-nowrap flex-shrink-0">
            <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" onClick={handleExportJSON} className="whitespace-nowrap flex-shrink-0">
            <Download className="mr-1.5 h-3.5 w-3.5" /> JSON
          </Button>
          <Button variant="ghost" size="sm" onClick={handleCopySummary} className="whitespace-nowrap flex-shrink-0">
            <Share2 className="mr-1.5 h-3.5 w-3.5" /> {copySuccess ? 'Copied!' : 'Share'}
          </Button>
          {session.tasks.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-500 hover:text-red-600 whitespace-nowrap flex-shrink-0"
              onClick={async () => {
                const confirmed = window.confirm("Are you sure? This will permanently delete all tasks in this session.");
                if (!confirmed) return;
                if (isSupabaseConfigured) {
                  const s = await clearSessionAsync();
                  setSession(s);
                } else {
                  clearSession();
                  setSession(getSession());
                }
                navigate('/assess');
              }}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Clear
            </Button>
          )}
        </div>
      </nav>

      <main className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <Card className="p-5 md:p-6 border border-slate-200 border-b-4 border-b-blue-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <Label className="text-slate-400 text-[10px] uppercase font-extrabold tracking-widest mb-1 block">Total Tasks</Label>
            <div className="text-3xl md:text-4xl font-extrabold text-slate-900 tracking-tight">{stats.total}</div>
          </Card>
          <Card className="p-5 md:p-6 border border-slate-200 border-b-4 border-b-green-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <Label className="text-slate-400 text-[10px] uppercase font-extrabold tracking-widest mb-1 block">Highly Automatable</Label>
            <div className="text-3xl md:text-4xl font-extrabold text-green-600 tracking-tight">{stats.fully}</div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">{Math.round((stats.fully / (stats.total || 1)) * 100)}% of workload</p>
          </Card>
          <Card className="p-5 md:p-6 border border-slate-200 border-b-4 border-b-cyan-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <Label className="text-slate-400 text-[10px] uppercase font-extrabold tracking-widest mb-1 block">Time Saved / Month</Label>
            <div className="text-3xl md:text-4xl font-extrabold text-cyan-600 tracking-tight">{Math.round(stats.totalTimeSaved)} hrs</div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">potential optimization</p>
          </Card>
          <Card className="p-5 md:p-6 border border-slate-200 border-b-4 border-b-purple-500 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
            <Label className="text-slate-400 text-[10px] uppercase font-extrabold tracking-widest mb-1 block">Est. Monthly Value</Label>
            <div className="text-3xl md:text-4xl font-extrabold text-purple-600 tracking-tight">₹{Math.round(stats.potentialSavings).toLocaleString()}</div>
            <p className="text-[11px] font-medium text-slate-400 mt-1">at ₹{hourlyRate || 35}/hr</p>
          </Card>
        </div>

        {/* Settings: Hourly rate & scoring weights */}
        <Card className="p-6 mb-8 border-l-4 border-l-slate-400">
          <button
            type="button"
            className="flex items-center justify-between w-full text-left py-1"
            onClick={() => setShowSettings(!showSettings)}
            aria-expanded={showSettings}
          >
            <div className="text-sm font-bold text-slate-700">
              Settings (hourly rate, scoring weights)
            </div>
            <ChevronRight className={cn("h-4 w-4 text-slate-400 transition-transform", showSettings && "rotate-90")} />
          </button>
          {showSettings && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-6 animate-in fade-in slide-in-from-top-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <Label htmlFor="hourlyRate" className="text-slate-700 font-bold mb-1 block">Hourly Rate (₹)</Label>
                  <p className="text-xs text-slate-500 mb-2">Used to calculate potential monthly savings (ROI).</p>
                  <Input
                    id="hourlyRate"
                    type="number"
                    min={0}
                    step={5}
                    placeholder="e.g. 50"
                    value={hourlyRate ?? ''}
                    onChange={e => {
                      const v = e.target.value;
                      const n = v === '' ? null : Number(v);
                      setHourlyRateState(n);
                      setHourlyRate(n);
                    }}
                    className="max-w-[120px]"
                  />
                </div>
                <div>
                  <Label className="text-slate-700 font-bold mb-1 block">Scoring Weights</Label>
                  <p className="text-xs text-slate-500 mb-2">Adjust how different criteria affect the 0-100 score.</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(['frequency', 'repetitiveness', 'dataDependency', 'decisionVariability', 'complexity'] as const).map(key => (
                      <div key={key}>
                        <Label className="text-[10px] text-slate-500 uppercase font-bold">{key}</Label>
                        <Input
                          type="number"
                          min={0}
                          max={1}
                          step={0.05}
                          value={weights[key]}
                          onChange={e => {
                            const next = { ...weights, [key]: Number(e.target.value) || 0 };
                            setWeightsState(next);
                            setScoringWeights(next);
                          }}
                          className="h-8 text-sm px-2"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 p-6 flex flex-col h-[400px]">
            <h3 className="font-bold text-lg mb-6">Automation Potential</h3>
            <div className="flex-1 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} domain={[0, 100]} />
                  <ChartTooltip
                    cursor={{ fill: '#f8fafc' }}
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-6 border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Filter View</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'All Tasks', count: stats.total, color: 'bg-blue-50 text-blue-700' },
                  { id: AutomationCategory.FullyAutomatable, label: 'Fully Automatable', count: stats.fully, color: 'bg-green-50 text-green-700' },
                  { id: AutomationCategory.PartiallyAutomatable, label: 'Partially Automatable', count: stats.partially, color: 'bg-amber-50 text-amber-700' },
                  { id: AutomationCategory.NotSuitable, label: 'Not Suitable', count: stats.total - stats.fully - stats.partially, color: 'bg-red-50 text-red-700' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full flex justify-between items-center px-4 py-3 rounded-xl text-sm transition-all duration-200",
                      selectedCategory === cat.id
                        ? "bg-slate-100 ring-1 ring-slate-200 font-bold"
                        : "hover:bg-slate-50 text-slate-600 font-medium"
                    )}
                  >
                    <span>{cat.label}</span>
                    <span className={cn("flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full text-[11px] font-bold shadow-sm", cat.color)}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="pt-6 border-t border-slate-100">
                <Label className="mb-3 block text-xs font-bold text-slate-400 uppercase tracking-widest">Department</Label>
                <Select
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  className="w-full bg-white border-slate-200 font-medium"
                >
                  <option value="all">All departments</option>
                  {availableDepartments.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </div>
            </div>
          </Card>
        </div>

        <h3 className="text-xl font-bold text-slate-900 mb-6 flex items-center gap-2 mt-12">
          <Layers className="h-5 w-5 text-blue-600" />
          Detailed Analysis
        </h3>

        {filteredScores.length === 0 ? (
          <Card className="p-12 text-center border-dashed border-2 bg-slate-50/50">
            <p className="text-slate-600 mb-4">No tasks match the current filters.</p>
            <Button variant="outline" onClick={() => { setSelectedCategory('all'); setSelectedDepartment('all'); }} aria-label="Clear all filters">
              Clear filters
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredScores.map(score => {
              const task = session.tasks.find(t => t.id === score.taskId);
              if (!task) return null;

              return (
                <Card key={task.id} className="overflow-hidden border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-8">
                    {/* Card Header */}
                    <div className="flex flex-col lg:flex-row justify-between items-start gap-6 mb-8">
                      <div className="flex-1 w-full">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <h4 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight break-words">{task.name}</h4>
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold border border-amber-200 shadow-sm">
                            {score.finalScore}/100
                          </span>
                        </div>
                        <p className="text-slate-500 text-sm leading-relaxed">{task.description}</p>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 sm:gap-8 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                        <div className="flex flex-col items-start lg:items-end">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Time Saved</span>
                          <div className="text-cyan-600 font-bold text-lg">
                            {(() => {
                              const timeSaved = estimateMonthlyTimeSaved({ timePerTask: task.timePerTask, frequency: task.frequency, finalScore: score.finalScore });
                              return timeSaved >= 1 ? `${Math.round(timeSaved)} hrs/mo` : `${Math.round(timeSaved * 60)} mins/mo`;
                            })()}
                          </div>
                        </div>
                        <div className="flex flex-col items-start lg:items-end">
                          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-1">Department</span>
                          <div className="text-slate-900 font-bold text-lg">{task.department || 'Operations'}</div>
                        </div>
                        <div className="flex items-center gap-1 sm:pl-2 ml-auto lg:ml-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
                            onClick={() => navigate('/assess', { state: { editTaskId: task.id } })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
                            onClick={async () => {
                              if (!window.confirm('Delete this task?')) return;
                              const next = isSupabaseConfigured
                                ? await removeTaskFromSessionAsync(task.id)
                                : removeTaskFromSession(task.id);
                              setSession(next);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Analysis Section */}
                    <div className="bg-slate-50/50 rounded-2xl p-6 mb-6 border border-slate-100">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                          <Globe className="h-4 w-4 text-slate-500" />
                          Analysis
                        </div>
                        <button
                          disabled={enhancingTaskId === task.id}
                          className="text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors disabled:opacity-50"
                          onClick={async () => {
                            try {
                              setEnhancingTaskId(task.id);
                              setEnhanceErrorTaskId(null);
                              const result = await enhanceWithGroq(task, score.criteriaScores, score.finalScore, score.category);
                              if (result) {
                                // Preserve existing tools if already present
                                const existingTools = score.suggestedTools || [];
                                const toolsToUse = existingTools.length > 0 ? existingTools : result.suggestedTools;

                                setSession(prev => {
                                  const baseScore = prev.scores[task.id] || scoreTask(task, weights);
                                  return {
                                    ...prev,
                                    scores: {
                                      ...prev.scores,
                                      [task.id]: {
                                        ...baseScore,
                                        taskId: task.id,
                                        reasoning: result.reasoning,
                                        automationAdvice: result.automationAdvice,
                                        suggestedTools: toolsToUse
                                      }
                                    }
                                  };
                                });
                                const update = {
                                  reasoning: result.reasoning,
                                  automationAdvice: result.automationAdvice,
                                  suggestedTools: toolsToUse
                                };
                                if (isSupabaseConfigured) await updateScoreInsightAsync(task.id, update);
                                else updateScoreInsight(task.id, update);
                              } else {
                                setEnhanceErrorTaskId(task.id);
                              }
                            } catch (err) {
                              setEnhanceErrorTaskId(task.id);
                            } finally {
                              setEnhancingTaskId(null);
                            }
                          }}
                        >
                          {enhancingTaskId === task.id ? 'Analyzing...' : 'Enhance with AI'}
                        </button>
                      </div>

                      <p className="text-[13px] text-slate-600 leading-relaxed mb-6">
                        {score.reasoning || "Analyzing task characteristics for deep insight..."}
                      </p>

                      {score.automationAdvice && (
                        <div className="bg-blue-50/50 rounded-xl p-5 border border-blue-100/50">
                          <h6 className="text-[11px] font-extrabold text-blue-700 uppercase tracking-widest mb-2">How to Automate</h6>
                          <p className="text-[13px] text-slate-700 leading-relaxed">
                            {score.automationAdvice}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Recommended Tools Section */}
                    {score.suggestedTools && score.suggestedTools.length > 0 && (
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
                          <Layers className="h-4 w-4 text-slate-500" />
                          Recommended Tools
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {score.suggestedTools.map((tool, i) => (
                            <div key={i} className="flex gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-blue-200 transition-colors">
                              <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                                <CheckCircle className="h-5 w-5 text-blue-500" />
                              </div>
                              <div className="space-y-1">
                                <div className="flex items-baseline gap-2">
                                  <span className="text-sm font-bold text-slate-900">{tool.category}</span>
                                  <span className="text-xs text-slate-400">{tool.name}</span>
                                </div>
                                <p className="text-[12px] text-slate-500 italic leading-snug">
                                  "{tool.explanation || 'Automatically generated recommendation'}"
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {enhanceErrorTaskId === task.id && (
                      <p className="text-[10px] text-red-600 mt-4 font-medium bg-red-50 p-2 rounded inline-block">
                        AI enhancement failed. Please check your API key.
                      </p>
                    )}
                  </div>

                  <div className="bg-slate-50/50 px-8 py-4 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-medium">
                    <div className="flex items-center gap-4">
                      <span>Critera: Freq({score.criteriaScores.frequency}) • Rep({score.criteriaScores.repetitiveness}) • Data({score.criteriaScores.dataDependency})</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      {task.timePerTask} mins/task
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}


export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/assess" element={
            <ProtectedRoute>
              <AssessmentPage />
            </ProtectedRoute>
          } />
          <Route path="/results" element={
            <ProtectedRoute>
              <ResultsPage />
            </ProtectedRoute>
          } />
          {/* Catch-all route to handle navigation and OAuth redirects */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}