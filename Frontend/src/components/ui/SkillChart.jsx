/**
 * SkillChart.jsx — Strengths vs gaps from an interview report.
 *  - Radar (≥ 3 scored skills) or horizontal bars, switchable
 *  - Dashed "target" series / line at TARGET_SCORE so gaps stand out
 *  - Chips below list strengths and gaps (including unscored gaps)
 */

import { useState } from 'react';
import {
    Bar, BarChart, CartesianGrid, Cell, Legend, PolarAngleAxis, PolarGrid, PolarRadiusAxis,
    Radar, RadarChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import clsx from 'clsx';
import Badge from './Badge';
import { classifySkills, STRENGTH_SCORE, TARGET_SCORE } from '../../utils/skills';

const COLORS = { strength: '#10b981', ok: '#3b82f6', gap: '#f59e0b', target: '#a1a1aa', grid: '#27272a' };
const tooltipStyle = { backgroundColor: '#16161a', borderColor: '#27272a', borderRadius: 12, color: '#ededed', fontSize: 13 };

const SkillChart = ({ skillBreakdown = [], skillGaps = [] }) => {
    const rows = classifySkills(skillBreakdown, skillGaps);
    const scored = rows.filter((r) => r.score !== null);
    const canRadar = scored.length >= 3;
    const [view, setView] = useState('radar');
    const mode = canRadar ? view : 'bar';

    const strengths = rows.filter((r) => r.status === 'strength');
    const gaps = rows.filter((r) => r.status === 'gap');

    return (
        <div>
            {canRadar && (
                <div className="flex justify-end mb-2 no-print" role="tablist" aria-label="Chart type">
                    {['radar', 'bar'].map((v) => (
                        <button
                            key={v}
                            role="tab"
                            aria-selected={view === v}
                            onClick={() => setView(v)}
                            className={clsx('px-3 py-1 text-xs rounded-lg capitalize', view === v ? 'bg-white/10 text-text' : 'text-muted hover:text-text')}
                        >
                            {v}
                        </button>
                    ))}
                </div>
            )}

            {scored.length > 0 && (
                <div className={mode === 'radar' ? 'h-80' : ''} style={mode === 'bar' ? { height: Math.max(180, scored.length * 44) } : undefined}>
                    <ResponsiveContainer width="100%" height="100%">
                        {mode === 'radar' ? (
                            <RadarChart data={scored} outerRadius="72%">
                                <PolarGrid stroke={COLORS.grid} />
                                <PolarAngleAxis dataKey="name" tick={{ fill: '#ededed', fontSize: 12 }} />
                                <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                                <Radar name={`Target (${TARGET_SCORE})`} dataKey="target" stroke={COLORS.target} strokeDasharray="4 4" fill="none" />
                                <Radar name="Your score" dataKey="score" stroke={COLORS.ok} fill={COLORS.ok} fillOpacity={0.3} />
                                <Legend wrapperStyle={{ fontSize: 12 }} />
                                <Tooltip contentStyle={tooltipStyle} />
                            </RadarChart>
                        ) : (
                            <BarChart data={scored} layout="vertical" margin={{ top: 5, right: 24, left: 8, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                                <XAxis type="number" domain={[0, 100]} stroke="#a1a1aa" fontSize={12} />
                                <YAxis dataKey="name" type="category" width={110} stroke="#ededed" fontSize={12} />
                                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
                                <ReferenceLine x={TARGET_SCORE} stroke={COLORS.target} strokeDasharray="4 4" label={{ value: 'Target', fill: '#a1a1aa', fontSize: 11, position: 'top' }} />
                                <Bar dataKey="score" name="Score" radius={[0, 6, 6, 0]} barSize={18}>
                                    {scored.map((r) => <Cell key={r.name} fill={COLORS[r.status]} />)}
                                </Bar>
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-secondary mb-2">Strengths</p>
                    <div className="flex flex-wrap gap-2">
                        {strengths.length ? strengths.map((r) => <Badge key={r.name} tone="success">{r.name} · {r.score}</Badge>) : <span className="text-sm text-muted">None at {STRENGTH_SCORE}+ yet</span>}
                    </div>
                </div>
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-warning mb-2">Gaps to close</p>
                    <div className="flex flex-wrap gap-2">
                        {gaps.length ? gaps.map((r) => <Badge key={r.name} tone="warning">{r.name}{r.score !== null && ` · ${r.score}`}</Badge>) : <span className="text-sm text-muted">No gaps identified</span>}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SkillChart;
