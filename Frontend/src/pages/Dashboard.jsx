import React from 'react';

const Dashboard = () => {
    return (
        <div>
            <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-surface p-6 rounded-xl border border-border">
                    <h3 className="text-muted text-sm uppercase font-bold mb-2">Total Interviews</h3>
                    <p className="text-4xl font-bold text-primary">12</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border">
                    <h3 className="text-muted text-sm uppercase font-bold mb-2">Avg. Score</h3>
                    <p className="text-4xl font-bold text-secondary">85%</p>
                </div>
                <div className="bg-surface p-6 rounded-xl border border-border">
                    <h3 className="text-muted text-sm uppercase font-bold mb-2">Pending Actions</h3>
                    <p className="text-4xl font-bold text-accent">3</p>
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
