import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { HashRouter as Router, Routes, Route, Link, useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, ResponsiveContainer, Cell
} from 'recharts';
import {
  ArrowRight, CheckCircle, BarChart2, Plus, Trash2, Download,
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
  const location = useLocation();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><p>Loading...</p></div>;
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <h2 className="text-2xl font-bold mb-4">Login Required</h2>
        <p className="text-slate-600 mb-6">You must be logged in to access this page.</p>
        <Button onClick={() => window.location.href = '#/'}>Go to Login</Button>
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
        <div className="flex items-center space-x-2">
          <Activity className="h-6 w-6 text-blue-600" aria-hidden />
          <span className="font-bold text-xl text-slate-900">AutoCheck</span>
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
        <section className="py-20 px-6 text-center max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-extrabold text-slate-900 mb-6 tracking-tight">
            Find where your business is <span className="text-blue-600">losing time and money</span> — and automate it
          </h1>
          <p className="text-lg text-slate-600 mb-8 max-w-2xl mx-auto">
            Stop wasting hours on manual work. Discover exactly what to automate in minutes. Our free assessment tool scores your business activities and suggests the right tools in minutes.
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
          role="dialog"
          aria-modal="true"
          aria-labelledby="demo-title"
          onClick={() => setDemoOpen(false)}
        >
          <Card
            className="max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 id="demo-title" className="text-xl font-bold text-slate-900">How it works</h2>
                <Button variant="ghost" size="sm" onClick={() => setDemoOpen(false)} aria-label="Close demo">
                  ×
                </Button>
              </div>
              <ol className="space-y-4 list-decimal list-inside text-slate-600">
                <li>
                  <strong className="text-slate-900">Submit tasks</strong> — Add one or more business tasks. Describe what you do, how often, and which data sources you use.
                </li>
                <li>
                  <strong className="text-slate-900">Get scores</strong> — Each task is scored on frequency, repetitiveness, data dependency, and complexity. You’ll see a 0–100 score and category (Fully / Partially / Not suitable).
                </li>
                <li>
                  <strong className="text-slate-900">Use insights</strong> — Review recommended tools, export CSV/JSON, and optionally set an hourly rate to see estimated monthly savings.
                </li>
              </ol>
              <Button className="w-full mt-6" onClick={() => { setDemoOpen(false); navigate('/assess'); }}>
                Try it now
              </Button>
            </div>
          </Card>
        </div>
      )}

      <footer className="bg-slate-900 text-slate-400 py-8 px-6 text-center">
        <p className="mb-2">© 2026 Quantumstacks Lab. All rights reserved.</p>
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
        setDept(task.department);
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
      department: dept,
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
          <div className="flex items-center space-x-2 font-bold text-lg text-slate-900">
            <Activity className="h-5 w-5 text-blue-600" />
            <span>AutoCheck</span>
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
            <p className="text-xs text-slate-500">{session.tasks.length} tasks added</p>
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
                  <Select id="dept" value={dept} onChange={e => setDept(e.target.value)}>
                    {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
                  </Select>
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
                <div className="grid grid-cols-2 gap-3">
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
                <div className="grid grid-cols-2 gap-3">
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

            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-500">
                {session.tasks.length > 0 ? `${session.tasks.length} tasks in session` : 'Start with your first task'}
              </span>
              <div className="space-x-4">
                {session.tasks.length > 0 && (
                  <Button type="button" variant="outline" onClick={() => navigate('/results')}>
                    Skip to Results
                  </Button>
                )}
                <Button type="submit" disabled={isSubmitting}>
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
    getSessionAsync().then(setSession).finally(() => setSessionLoading(false));
  }, []);

  const scores: TaskScore[] = Object.values(session.scores);

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
      name: task?.name.substring(0, 10) + '...',
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
      `AutoCheck – Automation Readiness (${new Date().toLocaleDateString()})`,
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

  if (scores.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No tasks analyzed yet</h2>
          <Button onClick={() => navigate('/assess')}>Add Your First Task</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center space-x-2 font-bold text-lg cursor-pointer" onClick={() => navigate('/')}>
          <Activity className="h-5 w-5 text-blue-600" />
          <span>AutoCheck Results</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/assess')}>
            <Plus className="mr-2 h-4 w-4" /> Add More
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <Download className="mr-2 h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => exportToPDF(session)}>
            <Download className="mr-2 h-4 w-4" /> Export PDF
          </Button>
          <Button variant="primary" size="sm" onClick={handleExportJSON}>
            <Download className="mr-2 h-4 w-4" /> Export JSON
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopySummary} aria-label="Copy summary to clipboard">
            <Share2 className="mr-2 h-4 w-4" /> {copySuccess ? 'Copied!' : 'Copy summary'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-500 hover:text-red-600"
            onClick={async () => {
              if (isSupabaseConfigured) await clearSessionAsync();
              else clearSession();
              navigate('/assess');
            }}
            aria-label="Clear session and start over"
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear session
          </Button>
        </div>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-8">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 border-l-4 border-blue-500">
            <p className="text-sm font-medium text-slate-500">Total Tasks</p>
            <h3 className="text-3xl font-bold">{stats.total}</h3>
          </Card>
          <Card className="p-6 border-l-4 border-green-500">
            <p className="text-sm font-medium text-slate-500">Highly Automatable</p>
            <h3 className="text-3xl font-bold text-green-600">{stats.fully}</h3>
            <p className="text-xs text-slate-400 mt-1">{Math.round((stats.fully / stats.total) * 100)}% of workload</p>
          </Card>
          <Card className="p-6 border-l-4 border-cyan-500">
            <p className="text-sm font-medium text-slate-500">Time Saved / Month</p>
            <h3 className="text-3xl font-bold text-cyan-600">
              {stats.totalTimeSaved >= 1
                ? `${Math.round(stats.totalTimeSaved)} hrs`
                : `${Math.round(stats.totalTimeSaved * 60)} mins`
              }
            </h3>
            <p className="text-xs text-slate-400 mt-1">based on automation scores</p>
          </Card>
          <Card className="p-6 border-l-4 border-purple-500">
            <p className="text-sm font-medium text-slate-500">Est. Monthly Value</p>
            <h3 className="text-3xl font-bold text-purple-600">₹{Math.round(stats.potentialSavings).toLocaleString()}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {hourlyRate != null && hourlyRate > 0 ? `based on ₹${hourlyRate}/hr` : 'Set hourly rate for estimate'}
            </p>
          </Card>
        </div>

        {/* Settings: Hourly rate & scoring weights */}
        <Card className="p-6">
          <button
            type="button"
            className="flex items-center justify-between w-full text-left font-semibold text-slate-900"
            onClick={() => setShowSettings(!showSettings)}
            aria-expanded={showSettings}
            aria-label={showSettings ? 'Hide settings' : 'Show settings'}
          >
            Settings (hourly rate, scoring weights)
            <ChevronRight className={cn("h-5 w-5 transition-transform", showSettings && "rotate-90")} />
          </button>
          {showSettings && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-4">
              <div>
                <Label htmlFor="hourlyRate">Hourly rate (₹) for ROI</Label>
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
                    setHourlyRateState(Number.isFinite(n) && n >= 0 ? n : null);
                    setHourlyRate(Number.isFinite(n) && n >= 0 ? n : null);
                  }}
                  className="max-w-[120px] mt-1"
                />
              </div>
              <div>
                <Label className="text-slate-700">Scoring weights (must sum to 1)</Label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-2">
                  {(['frequency', 'repetitiveness', 'dataDependency', 'decisionVariability', 'complexity'] as const).map(key => (
                    <div key={key}>
                      <Label className="text-xs text-slate-500">{key}</Label>
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
                        className="h-8 text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Chart */}
          <div className="lg:col-span-2">
            <Card className="p-6 h-[400px]">
              <h3 className="text-lg font-semibold mb-6">Automation Potential</h3>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" fontSize={12} />
                  <YAxis domain={[0, 100]} />
                  <ChartTooltip
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="score" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={getScoreColor(entry.score)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </div>

          {/* Filters & Legend */}
          <div>
            <Card className="p-6 h-full">
              <h3 className="text-lg font-semibold mb-4">Filter View</h3>
              <div className="space-y-2">
                {[
                  { id: 'all', label: 'All Tasks', count: stats.total },
                  { id: AutomationCategory.FullyAutomatable, label: 'Fully Automatable', count: stats.fully, color: 'bg-green-100 text-green-800' },
                  { id: AutomationCategory.PartiallyAutomatable, label: 'Partially Automatable', count: stats.partially, color: 'bg-amber-100 text-amber-800' },
                  { id: AutomationCategory.NotSuitable, label: 'Not Suitable', count: stats.total - stats.fully - stats.partially, color: 'bg-red-100 text-red-800' }
                ].map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "w-full flex justify-between items-center p-3 rounded-lg text-sm transition-colors",
                      selectedCategory === cat.id ? "bg-slate-100 ring-2 ring-slate-400" : "hover:bg-slate-50"
                    )}
                  >
                    <span className="font-medium">{cat.label}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", cat.color || "bg-slate-200")}>
                      {cat.count}
                    </span>
                  </button>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-slate-200">
                <Label className="text-slate-700">Department</Label>
                <Select
                  value={selectedDepartment}
                  onChange={e => setSelectedDepartment(e.target.value)}
                  className="mt-1"
                  aria-label="Filter by department"
                >
                  <option value="all">All departments</option>
                  {DEPARTMENTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </Select>
              </div>
            </Card>
          </div>
        </div>

        {/* Task List */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Detailed Analysis</h3>
          {filteredScores.length === 0 ? (
            <Card className="p-8 text-center">
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
                  <Card key={task.id} className="overflow-hidden">
                    <div className="p-6">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="text-xl font-bold text-slate-900">{task.name}</h4>
                            <Badge variant={
                              score.category === AutomationCategory.FullyAutomatable ? 'success' :
                                score.category === AutomationCategory.PartiallyAutomatable ? 'warning' : 'error'
                            }>
                              {score.finalScore}/100
                            </Badge>
                          </div>
                          <p className="text-slate-600 text-sm">{task.description}</p>
                        </div>
                        <div className="flex flex-shrink-0 items-center gap-4">
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Time Saved</span>
                            <p className="font-medium text-cyan-600">
                              {(() => {
                                const timeSaved = estimateMonthlyTimeSaved({ timePerTask: task.timePerTask, frequency: task.frequency, finalScore: score.finalScore });
                                return timeSaved >= 1 ? `${Math.round(timeSaved)} hrs/mo` : `${Math.round(timeSaved * 60)} mins/mo`;
                              })()}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Department</span>
                            <p className="font-medium">{task.department}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0"
                              onClick={() => navigate('/assess', { state: { editTaskId: task.id } })}
                              aria-label={`Edit ${task.name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-slate-500 hover:text-red-600"
                              onClick={async () => {
                                const next = isSupabaseConfigured
                                  ? await removeTaskFromSessionAsync(task.id)
                                  : removeTaskFromSession(task.id);
                                setSession(next);
                              }}
                              aria-label={`Delete ${task.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-lg p-4 mb-4">
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <h5 className="text-sm font-semibold text-slate-700 flex items-center">
                            <Brain className="w-4 h-4 mr-2" /> Analysis
                          </h5>
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={enhancingTaskId === task.id}
                            onClick={async () => {
                              setEnhancingTaskId(task.id);
                              setEnhanceErrorTaskId(null);
                              const result = await enhanceWithGroq(task, score.criteriaScores, score.finalScore, score.category);
                              setEnhancingTaskId(null);
                              if (result) {
                                const next = isSupabaseConfigured
                                  ? await updateScoreInsightAsync(task.id, { reasoning: result.reasoning, automationAdvice: result.automationAdvice, suggestedTools: result.suggestedTools })
                                  : updateScoreInsight(task.id, { reasoning: result.reasoning, automationAdvice: result.automationAdvice, suggestedTools: result.suggestedTools });
                                if (next) setSession(next);
                              } else {
                                setEnhanceErrorTaskId(task.id);
                              }
                            }}
                            aria-label="Enhance analysis with AI"
                          >
                            {enhancingTaskId === task.id ? 'Enhancing...' : 'Enhance with AI'}
                          </Button>
                        </div>
                        {enhanceErrorTaskId === task.id && <p className="text-xs text-red-600 mb-2">AI enhancement failed or no API key. Set VITE_GROQ_API_KEY in .env.local.</p>}
                        <p className="text-sm text-slate-600 mb-2">{score.reasoning}</p>
                        {score.automationAdvice && (
                          <div className="bg-blue-50 p-3 rounded border border-blue-100 mt-2">
                            <h6 className="text-xs font-bold text-blue-700 uppercase mb-1">How to Automate</h6>
                            <p className="text-sm text-slate-700">{score.automationAdvice}</p>
                          </div>
                        )}
                      </div>

                      {score.suggestedTools.length > 0 && (
                        <div>
                          <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center">
                            <Layers className="w-4 h-4 mr-2" /> Recommended Tools
                          </h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {score.suggestedTools.map((tool, idx) => (
                              <div key={idx} className="border border-slate-200 rounded p-3 flex items-start gap-3">
                                <div className="bg-blue-100 p-2 rounded text-blue-600">
                                  <CheckCircle className="w-4 h-4" />
                                </div>
                                <div>
                                  <p className="font-bold text-sm">{tool.category}</p>
                                  <p className="text-xs text-slate-500 mb-1">{tool.name}</p>
                                  <p className="text-xs text-slate-600 italic">"{tool.explanation}"</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-between text-xs text-slate-500">
                      <span>Critera: Freq({score.criteriaScores.frequency}) • Rep({score.criteriaScores.repetitiveness}) • Data({score.criteriaScores.dataDependency})</span>
                      <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {task.timePerTask} mins/task</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
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
          {/* Catch-all route to handle OAuth redirects with hash fragments that HashRouter doesn't recognise */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}