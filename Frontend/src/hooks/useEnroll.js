/**
 * useEnroll.js — "Buy" a course: create a checkout session and follow its payment link.
 * The mock provider links to our own /checkout/mock route; real providers
 * (Razorpay/Stripe) link off-site, so those use a full navigation.
 */

import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { coursesApi } from '../api/courses.api';

const useEnroll = () => {
    const navigate = useNavigate();
    const [enrollingId, setEnrollingId] = useState(null);

    const enroll = useCallback(
        async (course) => {
            setEnrollingId(course.id);
            try {
                const { data } = await coursesApi.checkout(course.id);
                const url = new URL(data.paymentLink, window.location.origin);
                if (url.origin === window.location.origin) navigate(url.pathname + url.search);
                else window.location.assign(url.toString());
            } catch (err) {
                toast.error(err.message);
            } finally {
                setEnrollingId(null);
            }
        },
        [navigate]
    );

    return { enroll, enrollingId };
};

export default useEnroll;
