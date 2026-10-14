import { motion } from 'framer-motion';
import { FiExternalLink, FiShoppingCart, FiZap } from 'react-icons/fi';
import Badge from './Badge';
import Button from './Button';
import { formatPrice } from '../../utils/format';


/**
 * course: { id, title, skillTag, price, currency, url, description }
 * why:    optional "why recommended" line (recommendations only)
 */
const CourseCard = ({ course, why, index = 0, onEnroll, enrolling = false }) => (
    <motion.article
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index, 8) * 0.05 }}
        className="group flex flex-col bg-surface border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-colors"
    >
        <div className="p-5 flex-1 flex flex-col">
            <div className="flex items-center justify-between gap-2 mb-3">
                <Badge tone="primary">{course.skillTag}</Badge>
                <span className="text-sm font-semibold">{formatPrice(course.price, course.currency)}</span>
            </div>
            <h3 className="font-semibold leading-snug">{course.title}</h3>
            {course.description && <p className="text-sm text-muted mt-2 line-clamp-3">{course.description}</p>}
            {why && (
                <p className="mt-4 text-sm text-accent bg-accent/5 border border-accent/15 rounded-xl px-3 py-2 flex gap-2">
                    <FiZap className="mt-0.5 shrink-0" />
                    <span>{why}</span>
                </p>
            )}
        </div>
        <div className="flex gap-2 p-4 pt-0">
            <Button variant="secondary" size="sm" className="flex-1" onClick={() => window.open(course.url, '_blank', 'noopener,noreferrer')}>
                <FiExternalLink /> Details
            </Button>
            {onEnroll && course.price > 0 && (
                <Button size="sm" className="flex-1" loading={enrolling} onClick={() => onEnroll(course)}>
                    <FiShoppingCart /> Enroll
                </Button>
            )}
        </div>
    </motion.article>
);

export default CourseCard;
