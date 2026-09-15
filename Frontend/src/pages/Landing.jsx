import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion } from 'framer-motion';
import { FiArrowRight, FiCheck, FiCpu, FiTarget, FiTrendingUp } from 'react-icons/fi';
import Navbar from '../components/layout/Navbar';
import { useAuthStore, selectIsAuthenticated } from '../store/useAuthStore';

gsap.registerPlugin(ScrollTrigger);

const Landing = () => {
    const isAuthenticated = useAuthStore(selectIsAuthenticated);
    const ctaTo = isAuthenticated ? '/dashboard' : '/register';

    const containerRef = useRef(null);
    const [typedText, setTypedText] = useState('');
    const fullText = "Next-Gen AI Interview Platform";

    // Typing Effect
    useEffect(() => {
        let index = 0;
        const interval = setInterval(() => {
            setTypedText(fullText.slice(0, index + 1));
            index++;
            if (index === fullText.length) clearInterval(interval);
        }, 50);
        return () => clearInterval(interval);
    }, []);

    // GSAP Animations
    useEffect(() => {
        const ctx = gsap.context(() => {
            // Hero Entrance
            gsap.from('.hero-element', {
                y: 100,
                opacity: 0,
                duration: 1.5,
                stagger: 0.2,
                ease: 'power4.out',
            });

            // Feature Cards Parallax
            gsap.utils.toArray('.feature-card').forEach((card) => {
                gsap.from(card, {
                    scrollTrigger: {
                        trigger: card,
                        start: 'top bottom-=100',
                        toggleActions: 'play none none reverse',
                    },
                    y: 50,
                    opacity: 0,
                    duration: 1,
                    ease: 'power3.out',
                });
            });
        }, containerRef);

        return () => ctx.revert();
    }, []);

    return (
        <div ref={containerRef} className="bg-background text-text overflow-hidden">
            <Navbar />


            {/* 🔮 Background Elements */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-accent/20 rounded-full blur-[120px] animate-pulse delay-1000" />
            </div>

            {/* 🚀 Hero Section */}
            <section className="relative min-h-[calc(100svh-4rem)] flex flex-col items-center justify-center text-center px-4 sm:px-6 py-16 z-10">
                <div className="hero-element mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface/50 border border-white/10 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-secondary animate-ping" />
                    <span className="text-sm font-medium text-secondary">Real-time voice interviews</span>
                </div>

                <h1 className="hero-element text-4xl sm:text-6xl md:text-8xl font-black mb-6 tracking-tight">
                    <span className="bg-gradient-to-r from-white via-gray-200 to-gray-500 bg-clip-text text-transparent">
                        {typedText}
                    </span>
                    <span className="animate-blink text-primary">_</span>
                </h1>

                <p className="hero-element text-lg md:text-2xl text-muted max-w-2xl mb-10 leading-relaxed">
                    Master your technical interviews with real-time AI feedback,
                    adaptive questioning, and comprehensive skill analysis.
                </p>

                <div className="hero-element flex gap-4 flex-col sm:flex-row w-full sm:w-auto">
                    <Link to={ctaTo} className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg overflow-hidden transition-transform hover:scale-105">
                        <span className="relative z-10 flex items-center gap-2">
                            {isAuthenticated ? 'Go to dashboard' : 'Start interviewing'} <FiArrowRight />
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent opacity-0 group-hover:opacity-20 transition-opacity" />
                    </Link>

                    <a href="#demo" className="px-8 py-4 bg-surface/50 border border-white/10 rounded-full font-medium text-lg hover:bg-white/5 transition-colors backdrop-blur-sm">
                        See how it works
                    </a>
                </div>
            </section>

            {/* ⚡ How It Works */}
            <section className="py-20 md:py-32 px-4 sm:px-6 relative z-10">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">How It Works</h2>
                        <p className="text-muted text-lg max-w-2xl mx-auto">
                            Our AI engine simulates a real interview environment, adapting to your responses in real-time.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: FiCpu,
                                title: "1. Upload Resume",
                                desc: "Our AI parses your PDF to understand your skills and experience level."
                            },
                            {
                                icon: FiTarget,
                                title: "2. Real-time Interview",
                                desc: "Answer dynamic technical questions. The AI evaluates your logic and depth."
                            },
                            {
                                icon: FiTrendingUp,
                                title: "3. Get Feedback",
                                desc: "Receive instant scoring, detailed feedback, and course recommendations."
                            }
                        ].map((item, idx) => (
                            <div key={idx} className="feature-card p-8 rounded-3xl bg-surface/30 border border-white/5 backdrop-blur-md hover:border-primary/50 transition-colors">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl text-primary mb-6">
                                    <item.icon />
                                </div>
                                <h3 className="text-2xl font-bold mb-4">{item.title}</h3>
                                <p className="text-muted leading-relaxed">{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 🤖 Interactive Demo Preview */}
            <section id="demo" className="py-20 md:py-32 px-4 sm:px-6 bg-surface/20 relative z-10 overflow-hidden">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                            An AI that <span className="text-primary">thinks</span> like a hiring manager.
                        </h2>
                        <div className="space-y-4">
                            {[
                                "Context-aware follow-up questions",
                                "Code complexity analysis",
                                "System design evaluation",
                                "Behavioral assessment"
                            ].map((text, i) => (
                                <div key={i} className="flex items-center gap-4 text-lg text-muted">
                                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-secondary/20 text-secondary flex items-center justify-center text-sm">
                                        <FiCheck />
                                    </span>
                                    {text}
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 w-full relative">
                        {/* Mock Chat Interface */}
                        <div className="relative z-10 bg-[#0f0f0f] rounded-2xl border border-white/10 shadow-2xl p-6 aspect-[4/3] flex flex-col gap-4">
                            {/* Message 1 (AI) */}
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="self-start max-w-[80%] bg-surface rounded-2xl rounded-tl-sm p-4 border border-white/5"
                            >
                                <div className="text-xs text-primary mb-1">AI Interviewer</div>
                                <p className="text-sm">Based on your resume, can you explain how you optimized the database query in your last project?</p>
                            </motion.div>

                            {/* Message 2 (User) */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                whileInView={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5, delay: 0.3 }}
                                className="self-end max-w-[80%] bg-primary/10 rounded-2xl rounded-tr-sm p-4 border border-primary/20"
                            >
                                <div className="text-xs text-secondary mb-1">You</div>
                                <p className="text-sm">I implemented composite indexing and switched to a read-replica architecture to reduce load...</p>
                            </motion.div>

                            {/* Message 3 (AI Analysis) */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.5, delay: 0.8 }}
                                className="mt-auto bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3"
                            >
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                                <span className="text-xs text-green-400 font-mono">Analysis: Strong answer. +15 pts.</span>
                            </motion.div>
                        </div>

                        {/* Glowing Backdrop */}
                        <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 to-accent/30 blur-[60px] -z-10" />
                    </div>
                </div>
            </section>

            {/* 🚀 CTA Section */}
            <section className="py-20 md:py-32 px-4 sm:px-6 text-center z-10 relative">
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-4xl md:text-6xl font-black mb-8">Ready to get hired?</h2>
                    <p className="text-lg md:text-xl text-muted mb-12">
                        Practise with an AI interviewer and walk into your next interview prepared.
                    </p>
                    <Link to={ctaTo} className="inline-block px-8 py-4 md:px-12 md:py-5 bg-white text-black rounded-full font-bold text-lg md:text-xl hover:scale-105 transition-transform shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]">
                        Get started free
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="py-10 border-t border-white/5 text-center text-muted text-sm relative z-10 bg-background">
                <p>© {new Date().getFullYear()} AI ATS · Built by Tushar Singla</p>
            </footer>
        </div>
    );
};

export default Landing;
