'use client';

import BLOCK_NavigationCard from '@/visuals/core_ui/nav/BLOCK_NavigationCard';
import BLOCK_QuickActions from '@/visuals/core_ui/clickables/quick_actions/BLOCK_QuickActions';
import { INTERACTION_SessionCard } from '@/visuals/core_ui/clickables/recent_sessions/INTERACTION_SessionCard';
import BLOCK_RecentSessions from '@/visuals/core_ui/clickables/recent_sessions/BLOCK_RecentSessions';

export default function Page() {
    // Mock data
    const userData = [
        {
            userProfileImage: "https://images.pexels.com/photos/28742872/pexels-photo-28742872.jpeg",
            userProfileAlt: "Image of user profile"
        }
    ]

    const recentSessions = [
        {
            userName: "Marcus Rodriguez",
            userID: "user1",
            thumbnailUrl: "https://images.pexels.com/photos/34822470/pexels-photo-34822470.jpeg?_gl=1*oa0egi*_ga*ODEyMzcxMDcwLjE3Njg5NjEyNDU.*_ga_8JE65Q40S6*czE3Njg5NjEyNDQkbzEkZzEkdDE3Njg5NjEyNDckajU3JGwwJGgw",
            thumbnailAlt: "Invoice preview for Marcus Rodriguez",
            date: "Jan 21, 2026",
            fileSize: "1.8MB",
            pageCount: 23,
        },
        {
            userName: "Aisha Patel",
            userID: "user2",
            thumbnailUrl: "https://images.pexels.com/photos/31544399/pexels-photo-31544399.jpeg?_gl=1*3vm33h*_ga*ODEyMzcxMDcwLjE3Njg5NjEyNDU.*_ga_8JE65Q40S6*czE3Njg5ODk3MzkkbzIkZzEkdDE3Njg5ODk3NDAkajU5JGwwJGgw",
            thumbnailAlt: "Invoice preview for Aisha Patel",
            date: "Jan 20, 2026",
            fileSize: "4.5MB",
            pageCount: 62,
        },
        {
            userName: "Chen Wei",
            userID: "user3",
            thumbnailUrl: "https://images.pexels.com/photos/33486705/pexels-photo-33486705.jpeg",
            thumbnailAlt: "Invoice preview for Chen Wei",
            date: "Jan 19, 2026",
            fileSize: "2.1MB",
            pageCount: 35,
        },
        {
            userName: "Sofia Kowalski",
            userID: "user4",
            thumbnailUrl: "https://images.pexels.com/photos/34822460/pexels-photo-34822460.jpeg",
            thumbnailAlt: "Invoice preview for Sofia Kowalski",
            date: "Jan 18, 2026",
            fileSize: "5.7MB",
            pageCount: 89,
        },
        {
            userName: "Jamal Thompson",
            userID: "user5",
            thumbnailUrl: "https://images.pexels.com/photos/32909799/pexels-photo-32909799.jpeg",
            thumbnailAlt: "Invoice preview for Jamal Thompson",
            date: "Jan 17, 2026",
            fileSize: "3.9MB",
            pageCount: 51,
        },
    ];

    return (
        <main className="min-h-screen bg-red-200">
            {/* NAV */}
            <BLOCK_NavigationCard 
                userData={userData}
            />

            {/* QUICK ACTIONS */}
            <BLOCK_QuickActions />

            {/* RECENT SESSIONS */}
            <section data-section="RECENT_SESSIONS" className="bg-[#F1F1F1] min-h-screen">
                <BLOCK_RecentSessions
                    sessions={recentSessions}
                />
            </section>
        </main>
    );
}