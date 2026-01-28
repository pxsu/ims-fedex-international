import { INTERACTION_SessionCard } from "./INTERACTION_SessionCard";

interface sessionData {
    // Identification
    userName: string;
    userID: string;

    // Data
    thumbnailUrl: string;
    thumbnailAlt?: string;
    date: string;
    fileSize: string;
    pageCount: number;

    // Interaction?
}

interface sessionDataProps {
    sessions: sessionData[]
}

export default function BLOCK_RecentSessions({ sessions }: sessionDataProps) {
    return (
        <section data-section="PARENT" className="relative min-h-screen">
            <div data-section="CENTER-POSITIONING" className="flex justify-center">
                <div className="grid grid-cols-2 xl:grid-cols-4 lg:grid-cols-3 gap-4 py-6">
                    {sessions.map((session) => (
                        <INTERACTION_SessionCard
                            key={session.userID}
                            userID={session.userID}
                            userName={session.userName}
                            thumbnailUrl={session.thumbnailUrl}
                            thumbnailAlt={session.thumbnailAlt}
                            date={session.date}
                            fileSize={session.fileSize}
                            pageCount={session.pageCount}
                        />
                    ))}
                </div>
            </div>
        </section>
    )
}