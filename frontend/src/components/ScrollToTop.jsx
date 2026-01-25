import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // We only want to scroll to top on navigation to specific pages, 
        // to preserve scroll position on back navigation for others if possible.
        // However, standard expectation is new view = top.
        // The issue 'user back to prev page' implies PREV page needs to restore scroll.
        // That is handled by browser if we don't force scroll on the prev page mount.

        // This component forces scroll to top on EVERY route change.
        // If we want to avoid it on POP (back), we might need more logic.
        // But for now, ensuring Details page starts at top is key.
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

export default ScrollToTop;
