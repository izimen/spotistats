-- SEC-004: Store Spotify access token server-side (not in JWT)
ALTER TABLE "User" ADD COLUMN "spotifyAccessToken" TEXT;
ALTER TABLE "User" ADD COLUMN "spotifyAccessTokenExpiry" TIMESTAMP(3);
