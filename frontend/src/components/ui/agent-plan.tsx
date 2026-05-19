"use client";

import React, { useState } from "react";
import {
  CheckCircle2,
  Circle,
  CircleAlert,
  CircleDotDashed,
  CircleX,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup, type Variants } from "framer-motion";

// Type definitions
interface Subtask {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  tools?: string[];
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  level: number;
  dependencies: string[];
  subtasks: Subtask[];
}

const initialTasks: Task[] = [
  {
    id: "1",
    title: "Research Project Requirements",
    description: "Gather all necessary information about project scope and requirements",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      { id: "1.1", title: "Interview stakeholders", description: "Conduct interviews with key stakeholders to understand needs", status: "completed", priority: "high", tools: ["communication-agent", "meeting-scheduler"] },
      { id: "1.2", title: "Review existing documentation", description: "Go through all available documentation and extract requirements", status: "in-progress", priority: "medium", tools: ["file-system", "browser"] },
      { id: "1.3", title: "Compile findings report", description: "Create a comprehensive report of all gathered information", status: "need-help", priority: "medium", tools: ["file-system", "markdown-processor"] },
    ],
  },
  {
    id: "2",
    title: "Design System Architecture",
    description: "Create the overall system architecture based on requirements",
    status: "in-progress",
    priority: "high",
    level: 0,
    dependencies: [],
    subtasks: [
      { id: "2.1", title: "Define component structure", description: "Map out all required components and their interactions", status: "pending", priority: "high", tools: ["architecture-planner", "diagramming-tool"] },
      { id: "2.2", title: "Create data flow diagrams", description: "Design diagrams showing how data will flow through the system", status: "pending", priority: "medium", tools: ["diagramming-tool", "file-system"] },
      { id: "2.3", title: "Document API specifications", description: "Write detailed specifications for all APIs in the system", status: "pending", priority: "high", tools: ["api-designer", "openapi-generator"] },
    ],
  },
];

export default function Plan() {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [expandedTasks, setExpandedTasks] = useState<string[]>(["1"]);
  const [expandedSubtasks, setExpandedSubtasks] = useState<{ [key: string]: boolean }>({});
  const prefersReducedMotion = typeof window !== "undefined" ? window.matchMedia("(prefers-reduced-motion: reduce)").matches : false;

  const toggleTaskExpansion = (taskId: string) => {
    setExpandedTasks((prev) => prev.includes(taskId) ? prev.filter((id) => id !== taskId) : [...prev, taskId]);
  };

  const toggleSubtaskExpansion = (taskId: string, subtaskId: string) => {
    const key = `${taskId}-${subtaskId}`;
    setExpandedSubtasks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const toggleTaskStatus = (taskId: string) => {
    setTasks((prev) => prev.map((task) => {
      if (task.id === taskId) {
        const statuses = ["completed", "in-progress", "pending", "need-help", "failed"];
        const newStatus = statuses[Math.floor(Math.random() * statuses.length)];
        return { ...task, status: newStatus, subtasks: task.subtasks.map((s) => ({ ...s, status: newStatus === "completed" ? "completed" : s.status })) };
      }
      return task;
    }));
  };

  const toggleSubtaskStatus = (taskId: string, subtaskId: string) => {
    setTasks((prev) => prev.map((task) => {
      if (task.id === taskId) {
        const updatedSubtasks = task.subtasks.map((s) => s.id === subtaskId ? { ...s, status: s.status === "completed" ? "pending" : "completed" } : s);
        return { ...task, subtasks: updatedSubtasks, status: updatedSubtasks.every((s) => s.status === "completed") ? "completed" : task.status };
      }
      return task;
    }));
  };

  const taskVariants: Variants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : -5 },
    visible: { opacity: 1, y: 0, transition: { type: prefersReducedMotion ? "tween" : "spring" as const, stiffness: 500, damping: 30 } },
    exit: { opacity: 0, y: prefersReducedMotion ? 0 : -5, transition: { duration: 0.15 } },
  };

  const subtaskListVariants: Variants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" },
    visible: { height: "auto", opacity: 1, overflow: "visible", transition: { duration: 0.25, staggerChildren: prefersReducedMotion ? 0 : 0.05, when: "beforeChildren", ease: [0.2, 0.65, 0.3, 0.9] as const } },
    exit: { height: 0, opacity: 0, overflow: "hidden", transition: { duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] as const } },
  };

  const subtaskVariants: Variants = {
    hidden: { opacity: 0, x: prefersReducedMotion ? 0 : -10 },
    visible: { opacity: 1, x: 0, transition: { type: prefersReducedMotion ? "tween" : "spring" as const, stiffness: 500, damping: 25 } },
    exit: { opacity: 0, x: prefersReducedMotion ? 0 : -10, transition: { duration: 0.15 } },
  };

  const subtaskDetailsVariants: Variants = {
    hidden: { opacity: 0, height: 0, overflow: "hidden" },
    visible: { opacity: 1, height: "auto", overflow: "visible", transition: { duration: 0.25, ease: [0.2, 0.65, 0.3, 0.9] as const } },
  };

  const StatusIcon = ({ status, size = "h-4 w-4" }: { status: string; size?: string }) => (
    <AnimatePresence mode="wait">
      <motion.div key={status} initial={{ opacity: 0, scale: 0.8, rotate: -10 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.8, rotate: 10 }} transition={{ duration: 0.2, ease: [0.2, 0.65, 0.3, 0.9] as const }}>
        {status === "completed" ? <CheckCircle2 className={`${size} text-green-500`} />
          : status === "in-progress" ? <CircleDotDashed className={`${size} text-blue-500`} />
          : status === "need-help" ? <CircleAlert className={`${size} text-yellow-500`} />
          : status === "failed" ? <CircleX className={`${size} text-red-500`} />
          : <Circle className={`${size} text-muted-foreground`} />}
      </motion.div>
    </AnimatePresence>
  );

  return (
    <div className="bg-background text-foreground h-full overflow-auto p-2">
      <motion.div className="bg-card border-border rounded-lg border shadow overflow-hidden" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.2, 0.65, 0.3, 0.9] as const } }}>
        <LayoutGroup>
          <div className="p-4 overflow-hidden">
            <ul className="space-y-1 overflow-hidden">
              {tasks.map((task, index) => {
                const isExpanded = expandedTasks.includes(task.id);
                return (
                  <motion.li key={task.id} className={index !== 0 ? "mt-1 pt-2" : ""} initial="hidden" animate="visible" variants={taskVariants}>
                    <motion.div className="group flex items-center px-3 py-1.5 rounded-md" whileHover={{ backgroundColor: "rgba(0,0,0,0.03)", transition: { duration: 0.2 } }}>
                      <motion.div className="mr-2 flex-shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleTaskStatus(task.id); }} whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }}>
                        <StatusIcon status={task.status} />
                      </motion.div>
                      <motion.div className="flex min-w-0 flex-grow cursor-pointer items-center justify-between" onClick={() => toggleTaskExpansion(task.id)}>
                        <div className="mr-2 flex-1 truncate">
                          <span className={task.status === "completed" ? "text-muted-foreground line-through" : ""}>{task.title}</span>
                        </div>
                        <motion.span className={`rounded px-1.5 py-0.5 text-xs ${task.status === "completed" ? "bg-green-100 text-green-700" : task.status === "in-progress" ? "bg-blue-100 text-blue-700" : task.status === "need-help" ? "bg-yellow-100 text-yellow-700" : task.status === "failed" ? "bg-red-100 text-red-700" : "bg-muted text-muted-foreground"}`} key={task.status}>
                          {task.status}
                        </motion.span>
                      </motion.div>
                    </motion.div>
                    <AnimatePresence mode="wait">
                      {isExpanded && task.subtasks.length > 0 && (
                        <motion.div className="relative overflow-hidden" variants={subtaskListVariants} initial="hidden" animate="visible" exit="hidden" layout>
                          <div className="absolute top-0 bottom-0 left-[20px] border-l-2 border-dashed border-muted-foreground/30" />
                          <ul className="border-muted mt-1 mr-2 mb-1.5 ml-3 space-y-0.5">
                            {task.subtasks.map((subtask) => {
                              const subtaskKey = `${task.id}-${subtask.id}`;
                              const isSubtaskExpanded = expandedSubtasks[subtaskKey];
                              return (
                                <motion.li key={subtask.id} className="group flex flex-col py-0.5 pl-6" onClick={() => toggleSubtaskExpansion(task.id, subtask.id)} variants={subtaskVariants} initial="hidden" animate="visible" exit="exit" layout>
                                  <motion.div className="flex flex-1 items-center rounded-md p-1" whileHover={{ backgroundColor: "rgba(0,0,0,0.03)" }} layout>
                                    <motion.div className="mr-2 flex-shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); toggleSubtaskStatus(task.id, subtask.id); }} whileTap={{ scale: 0.9 }} whileHover={{ scale: 1.1 }} layout>
                                      <StatusIcon status={subtask.status} size="h-3.5 w-3.5" />
                                    </motion.div>
                                    <span className={`cursor-pointer text-sm ${subtask.status === "completed" ? "text-muted-foreground line-through" : ""}`}>{subtask.title}</span>
                                  </motion.div>
                                  <AnimatePresence mode="wait">
                                    {isSubtaskExpanded && (
                                      <motion.div className="text-muted-foreground border-foreground/20 mt-1 ml-1.5 border-l border-dashed pl-5 text-xs overflow-hidden" variants={subtaskDetailsVariants} initial="hidden" animate="visible" exit="hidden" layout>
                                        <p className="py-1">{subtask.description}</p>
                                        {subtask.tools && subtask.tools.length > 0 && (
                                          <div className="mt-0.5 mb-1 flex flex-wrap items-center gap-1.5">
                                            <span className="text-muted-foreground font-medium">Tools:</span>
                                            {subtask.tools.map((tool, idx) => (
                                              <motion.span key={idx} className="bg-secondary/40 text-secondary-foreground rounded px-1.5 py-0.5 text-[10px] font-medium shadow-sm" initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.2, delay: idx * 0.05 } }} whileHover={{ y: -1 }}>
                                                {tool}
                                              </motion.span>
                                            ))}
                                          </div>
                                        )}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </motion.li>
                              );
                            })}
                          </ul>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        </LayoutGroup>
      </motion.div>
    </div>
  );
}
