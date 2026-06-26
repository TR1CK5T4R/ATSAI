import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const SkillChart = ({ data }) => {
    // data format: [{ name: 'React', score: 85 }, ...]

    return (
        <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} stroke="#a1a1aa" />
                    <YAxis dataKey="name" type="category" width={100} stroke="#ededed" fontSize={12} />
                    <Tooltip
                        contentStyle={{ backgroundColor: '#121212', borderColor: '#27272a', color: '#fff' }}
                        cursor={{ fill: '#3b82f6', opacity: 0.1 }}
                    />
                    <Bar dataKey="score" radius={[0, 4, 4, 0]} barSize={20}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.score > 80 ? '#10b981' : entry.score > 50 ? '#3b82f6' : '#ef4444'} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
};

export default SkillChart;
