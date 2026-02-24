
"use client";

import { useEffect, useState } from 'react';
import { useDoc, useFirestore, useUser } from '@/firebase';
import { doc } from 'firebase/firestore';

export function SpotifyRealTime() {
  const { user } = useUser();
  const db = useFirestore();
  const [currentlyPlaying, setCurrentlyPlaying] = useState(null);

  const userRef = user ? doc(db, 'usuarios', user.uid) : null;
  const { data: userData } = useDoc(userRef);

  useEffect(() => {
    const fetchCurrentlyPlaying = async () => {
      if (userData?.spotifyAccessToken) {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            Authorization: `Bearer ${userData.spotifyAccessToken}`,
          },
        });

        if (response.status === 204) {
          setCurrentlyPlaying(null);
          return;
        }

        if (response.ok) {
          const data = await response.json();
          setCurrentlyPlaying(data);
        }
      }
    };

    const interval = setInterval(fetchCurrentlyPlaying, 5000);

    return () => clearInterval(interval);
  }, [userData?.spotifyAccessToken]);

  if (!currentlyPlaying) {
    return <div>No song playing</div>;
  }

  return (
    <div>
      <h2>Currently Playing</h2>
      <p>{currentlyPlaying.item.name}</p>
      <p>{currentlyPlaying.item.artists.map((artist) => artist.name).join(', ')}</p>
    </div>
  );
}
