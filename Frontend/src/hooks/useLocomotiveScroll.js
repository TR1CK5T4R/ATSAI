import { useEffect } from 'react';
import LocomotiveScroll from 'locomotive-scroll';
import 'locomotive-scroll/dist/locomotive-scroll.css';

const useLocomotiveScroll = (start = true) => {
    useEffect(() => {
        if (!start) return;

        const scrollEl = document.querySelector('#main-container');

        const locomotiveScroll = new LocomotiveScroll({
            el: scrollEl,
            smooth: true,
            multiplier: 1,
            class: 'is-revealed',
        });

        return () => {
            if (locomotiveScroll) locomotiveScroll.destroy();
        };
    }, [start]);
};

export default useLocomotiveScroll;
