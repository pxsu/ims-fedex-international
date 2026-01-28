// LIBRARY IMPORTS
import { useRouter } from 'next/navigation';

// COMPONENTS
import INTERACTION_Profile from "./INTERACTION_Profile";

interface UserData {
    userProfileImage: string;
    userProfileAlt: string;
}

interface NavigationDataArchitecture {
    userData: UserData[];
}

export default function BLOCK_NavigationCard({ userData }: NavigationDataArchitecture) {
    const router = useRouter();
    
    const pfp = userData[0].userProfileImage;
    const pfpAlt = userData[0].userProfileAlt;

    return (
        <>
            <nav className="bg-[#F1F1F1] flex justify-between items-center px-8 py-2 sticky top-0 z-1000">
                <div>
                    <button 
                        onClick={() => router.push('/home')}
                        className="text-md xl:text-2xl font-bold text-[#222222] cursor-pointer">ims
                    </button>
                </div>
                <div className="bg-white text-black/60 h-12 w-75 md:w-150 rounded-full px-4 flex items-center gap-2 cursor-pointer">
                    <div data-section="SEARCH-ICON">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="size-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
                        </svg>
                    </div>
                    <div className="text-md">Search</div>
                </div>
                <INTERACTION_Profile 
                    userProfileImage={pfp}
                    userProfileAlt={pfpAlt}
                />
            </nav>
        </>
    )
}