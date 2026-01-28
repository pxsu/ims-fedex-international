import Image from 'next/image';

interface ProfileArchitecture {
    userProfileImage: string;
    userProfileAlt: string;
}

export default function INTERACTION_Profile({
    userProfileImage,
    userProfileAlt
}: ProfileArchitecture) {
    return (
        <main className="relative w-12 h-12 rounded-full bg-[#E0E0E0] text-[12px] flex items-center justify-center cursor-pointer">
            <Image
                src={userProfileImage}
                alt={userProfileAlt || "An image preview of the user's profile picture"}
                fill
                className="object-cover rounded-full"
            />
        </main>
    )
}