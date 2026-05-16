select p.user_id, p.email, p.timezone, up.default_focus_minutes
from public.profiles p
join public.user_preferences up on up.user_id = p.user_id
where p.email = 'your-test-email@example.com';