/**
 * MockCheckout.jsx — Landing page for the MOCK payment provider's link.
 * No money moves; it only lets the purchase flow be exercised end to end until
 * a real provider (Razorpay/Stripe) is plugged into the backend.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiCreditCard, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import toast from 'react-hot-toast';
import { coursesApi } from '../api/courses.api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { PageLoader } from '../components/ui/Spinner';
import { formatPrice } from '../utils/format';

const MockCheckout = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const [course, setCourse] = useState(undefined);
    const orderId = params.get('orderId');
    const courseId = params.get('courseId');

    useEffect(() => {
        if (!courseId) return;
        coursesApi.getCourse(courseId).then((res) => setCourse(res.data)).catch(() => setCourse(null));
    }, [courseId]);

    if (courseId && course === undefined) return <PageLoader />;
    if (!course || !orderId) {
        return <EmptyState icon={FiAlertCircle} title="Invalid checkout link" action={<Button to="/courses">Back to courses</Button>} />;
    }

    const finish = (success) => {
        if (success) toast.success('Mock payment succeeded — no money was charged');
        else toast('Payment cancelled');
        navigate('/courses');
    };

    return (
        <div className="max-w-lg mx-auto">
            <Card className="space-y-6">
                <div className="flex items-start gap-3 rounded-xl bg-warning/10 border border-warning/20 p-3 text-sm text-warning">
                    <FiAlertCircle className="mt-0.5 shrink-0" />
                    <p>This is a <strong>mock checkout</strong>. No payment is processed until Razorpay/Stripe is connected.</p>
                </div>
                <div>
                    <p className="text-xs uppercase tracking-wider text-muted font-semibold">Order {orderId}</p>
                    <h1 className="text-xl font-bold mt-1">{course.title}</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Badge tone="primary">{course.skillTag}</Badge>
                    </div>
                </div>
                <div className="flex items-center justify-between border-t border-border pt-4">
                    <span className="text-muted">Total</span>
                    <span className="text-2xl font-bold">{formatPrice(course.price, course.currency)}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Button variant="secondary" onClick={() => finish(false)}>Cancel</Button>
                    <Button onClick={() => finish(true)}>
                        <FiCreditCard /> Simulate payment
                    </Button>
                </div>
                <p className="flex items-center gap-1.5 text-xs text-muted">
                    <FiCheckCircle /> Real purchases will be confirmed by a verified payment webhook.
                </p>
            </Card>
        </div>
    );
};

export default MockCheckout;
