/**
 * ResumeUpload.jsx — Upload a PDF/DOCX resume and review what the AI extracted.
 * Shows the latest resume on load, so returning users land on their parsed data.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUploadCloud, FiFileText, FiArrowRight, FiBriefcase, FiFolder, FiBookOpen, FiX } from 'react-icons/fi';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { resumeApi } from '../api/resume.api';
import PageHeader from '../components/ui/PageHeader';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import CircularProgress from '../components/ui/CircularProgress';
import { PageLoader } from '../components/ui/Spinner';
import { formatDate } from '../utils/format';

const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPTED = {
    'application/pdf': 'PDF',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};
const ACCEPT_ATTR = '.pdf,.docx,' + Object.keys(ACCEPTED).join(',');

const validateFile = (file) => {
    if (!file) return 'No file selected';
    const okType = ACCEPTED[file.type] || /\.(pdf|docx)$/i.test(file.name);
    if (!okType) return 'Only PDF or DOCX files are supported';
    if (file.size > MAX_BYTES) return 'File must be 5 MB or smaller';
    return null;
};

const Section = ({ icon: Icon, title, children }) => (
    <Card>
        <h3 className="flex items-center gap-2 font-semibold mb-4">
            <Icon className="text-primary" /> {title}
        </h3>
        {children}
    </Card>
);

/** What the AI extracted from the resume */
const ParsedResume = ({ resume, score, onStart }) => {
    const p = resume.parsed || {};
    return (
        <div className="space-y-6">
            <Card className="flex flex-col sm:flex-row items-center gap-6">
                <CircularProgress score={score} size={110} />
                <div className="flex-1 text-center sm:text-left">
                    <p className="text-xs uppercase tracking-wider text-muted font-semibold">Parsed resume</p>
                    <h2 className="text-xl font-bold mt-1">{p.name || 'Your resume'}</h2>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-3">
                        {p.seniorityLevel && <Badge tone="accent">{p.seniorityLevel}</Badge>}
                        <Badge>{p.experienceYears ?? 0} yrs experience</Badge>
                        <Badge>Uploaded {formatDate(resume.createdAt)}</Badge>
                    </div>
                </div>
                <Button size="lg" onClick={onStart} className="w-full sm:w-auto">
                    Start interview <FiArrowRight />
                </Button>
            </Card>

            <Section icon={FiFileText} title={`Skills (${p.skills?.length || 0})`}>
                {p.skills?.length ? (
                    <div className="flex flex-wrap gap-2">
                        {p.skills.map((s) => <Badge key={s} tone="primary">{s}</Badge>)}
                    </div>
                ) : (
                    <p className="text-sm text-muted">No skills detected — consider adding a dedicated skills section.</p>
                )}
            </Section>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Section icon={FiBriefcase} title="Experience">
                    {p.experience?.length ? (
                        <ul className="space-y-4">
                            {p.experience.map((e, i) => (
                                <li key={i}>
                                    <p className="font-medium">{e.title || 'Role'}{e.company && <span className="text-muted"> · {e.company}</span>}</p>
                                    <p className="text-xs text-muted">{[e.startDate, e.endDate].filter(Boolean).join(' – ')}</p>
                                    {e.description && <p className="text-sm text-muted mt-1 line-clamp-3">{e.description}</p>}
                                </li>
                            ))}
                        </ul>
                    ) : <p className="text-sm text-muted">No experience entries found.</p>}
                </Section>

                <div className="space-y-6">
                    <Section icon={FiFolder} title="Projects">
                        {p.projects?.length ? (
                            <ul className="space-y-3">
                                {p.projects.map((pr, i) => (
                                    <li key={i}>
                                        <p className="font-medium">{pr.name || 'Project'}</p>
                                        {pr.technologies?.length > 0 && <p className="text-xs text-muted">{pr.technologies.join(' · ')}</p>}
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted">No projects found.</p>}
                    </Section>
                    <Section icon={FiBookOpen} title="Education">
                        {p.education?.length ? (
                            <ul className="space-y-2">
                                {p.education.map((ed, i) => (
                                    <li key={i} className="text-sm">
                                        <span className="font-medium">{ed.degree || 'Degree'}</span>
                                        <span className="text-muted">{ed.institution && ` · ${ed.institution}`}{ed.year && ` · ${ed.year}`}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="text-sm text-muted">No education entries found.</p>}
                    </Section>
                </div>
            </div>
        </div>
    );
};

const ResumeUpload = () => {
    const navigate = useNavigate();
    const inputRef = useRef(null);
    const [file, setFile] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [resume, setResume] = useState(undefined); // undefined = loading, null = none yet
    const [score, setScore] = useState(0);

    useEffect(() => {
        Promise.all([resumeApi.getMyResume(), resumeApi.getLatestScore()])
            .then(([mine, s]) => {
                const latest = mine.data?.[0];
                setResume(latest ? { id: latest.id, parsed: latest.parsedJson, createdAt: latest.createdAt } : null);
                setScore(s.score || 0);
            })
            .catch((err) => {
                toast.error(err.message);
                setResume(null);
            });
    }, []);

    const pickFile = useCallback((candidate) => {
        const error = validateFile(candidate);
        if (error) {
            toast.error(error);
            return;
        }
        setFile(candidate);
    }, []);

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const form = new FormData();
        form.append('resume', file);
        try {
            const { data } = await resumeApi.uploadResume(form);
            const s = await resumeApi.getLatestScore();
            setResume({ id: data.id, parsed: data.structured, createdAt: new Date().toISOString() });
            setScore(s.score || 0);
            setFile(null);
            toast.success('Resume analysed!');
        } catch (err) {
            toast.error(err.message);
        } finally {
            setUploading(false);
        }
    };

    if (resume === undefined) return <PageLoader />;

    return (
        <>
            <PageHeader
                title="Your resume"
                description="Upload a PDF or DOCX. The AI extracts your skills and experience to tailor your interview."
            />

            {/* Upload zone */}
            <Card className="mb-8">
                <div
                    role="button"
                    tabIndex={0}
                    onClick={() => inputRef.current?.click()}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
                    className={clsx(
                        'flex flex-col items-center justify-center text-center rounded-xl border-2 border-dashed px-6 py-10 cursor-pointer transition-colors',
                        dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-muted/60'
                    )}
                >
                    <FiUploadCloud className="w-10 h-10 text-primary mb-3" />
                    <p className="font-medium">{resume ? 'Upload a new version' : 'Drop your resume here'}</p>
                    <p className="text-sm text-muted mt-1">or click to browse · PDF or DOCX · max 5 MB</p>
                    <input ref={inputRef} type="file" accept={ACCEPT_ATTR} className="hidden" onChange={(e) => pickFile(e.target.files[0])} />
                </div>

                {file && (
                    <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl bg-surface-2 border border-border p-3">
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FiFileText className="text-primary shrink-0" />
                            <span className="truncate text-sm">{file.name}</span>
                            <span className="text-xs text-muted shrink-0">{(file.size / 1024).toFixed(0)} KB</span>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="sm" onClick={() => setFile(null)} disabled={uploading}>
                                <FiX /> Remove
                            </Button>
                            <Button size="sm" onClick={handleUpload} loading={uploading}>
                                {uploading ? 'Analysing…' : 'Upload & analyse'}
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {resume && <ParsedResume resume={resume} score={score} onStart={() => navigate('/interview', { state: { resumeId: resume.id } })} />}
        </>
    );
};

export default ResumeUpload;
