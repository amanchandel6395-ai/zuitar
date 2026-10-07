create policy "anon read active effects" on public.effects for select to anon using (is_active);
create policy "anon read active characters" on public.ai_characters for select to anon using (is_active);
create policy "anon read active person poses" on public.ai_person_poses for select to anon using (is_active);
grant select on public.effects, public.ai_characters, public.ai_person_poses to anon;

update public.ai_person_poses set is_active = false;
insert into public.ai_person_poses (name, emoji, prompt, sort_order, is_active) values
('Standing', '🧍', 'Both stand side by side facing the camera, smiling, close together like a proud commemorative photo.', 1, true),
('Handshake', '🤝', 'The two are shaking hands warmly, turned slightly toward each other and looking at the camera.', 2, true),
('Hug', '🫂', 'The added person gives the customer a friendly, respectful side hug with one arm, both smiling at the camera.', 3, true),
('Walk', '🚶', 'Both are walking together side by side mid-stride, talking, shot like a candid photo.', 4, true),
('Meeting', '💼', 'Both are seated across a table in a formal meeting, turned toward the camera, with papers and a small flag on the table.', 5, true),
('BJP scarf', '🧣', 'The added person is gently placing a saffron and green BJP party scarf (with lotus symbol) around the customer''s neck, both smiling.', 6, true),
('Office', '🏛️', 'Both pose together in a grand official government office with a large wooden desk, Indian flag and bookshelves behind them.', 7, true);

insert into public.effects (name, emoji, category, prompt, sort_order, is_active) values
('Office', '🏢', 'place', 'Set the whole scene in an elegant official office interior.', 101, true),
('Meeting room', '🪑', 'place', 'Set the whole scene in a formal meeting room with a long table.', 102, true),
('Public event', '🎤', 'place', 'Set the whole scene at a large outdoor public event with a stage, saffron decorations and a crowd behind.', 103, true),
('Neutral', '⬜', 'place', 'Set the whole scene against a clean neutral professional studio background.', 104, true),
('Supporter Look', '🪷', 'bjp', 'Transform the person into a proud BJP supporter: saffron kurta, lotus badge on chest, saffron and green background with lotus motifs. Keep the face exactly recognizable.', 201, true),
('Flag Look', '🚩', 'bjp', 'The person proudly holds a waving BJP saffron-and-green flag with the lotus symbol, bright sky behind. Keep the face exactly recognizable.', 202, true),
('Cap Look', '🧢', 'bjp', 'Add a saffron BJP cap with the lotus symbol on the person''s head and a saffron-themed background. Keep the face exactly recognizable.', 203, true),
('Scarf Look', '🧣', 'bjp', 'Drape a saffron and green BJP scarf with lotus symbols around the person''s neck, warm campaign lighting. Keep the face exactly recognizable.', 204, true),
('Campaign Poster', '📣', 'bjp', 'Turn the photo into a bold BJP-style campaign poster: saffron gradient, large lotus symbol, dramatic lighting, the person as the hero. No real slogans with false claims. Keep the face exactly recognizable.', 205, true),
('Festival Look', '🎉', 'bjp', 'Festive celebration scene: saffron marigold garlands, flags with the lotus symbol, colorful confetti and fireworks, the person celebrating. Keep the face exactly recognizable.', 206, true);