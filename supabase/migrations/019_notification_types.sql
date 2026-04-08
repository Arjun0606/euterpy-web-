-- ============================================================
-- Extend notification types for the social layer:
--   mark   = someone marked your story / list / chart / lyric
--   echo   = someone echoed (reposted) your content
--   letter = someone left a letter (comment) on your story
-- ============================================================

-- Drop the old check constraint and add a new one with extended kinds.
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('follow', 'follow_request', 'review_vote', 'badge_earned', 'mark', 'echo', 'letter'));

-- Allow inserts from anywhere — the client-side action handlers
-- (MarkButton, EchoButton, StoryCommentsThread) write notifications
-- directly when the action's owner isn't the actor. The existing
-- notifications policies only cover SELECT and UPDATE for own rows.
DROP POLICY IF EXISTS "Insert notifications" ON notifications;
CREATE POLICY "Insert notifications" ON notifications FOR INSERT WITH CHECK (true);
