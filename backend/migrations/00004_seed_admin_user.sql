-- +goose Up
INSERT INTO users (
    id,
    clerk_id,
    full_name,
    email,
    role,
    is_password_reset
) VALUES (
    gen_random_uuid(),
    'clerk_placeholder_admin',
    'ProxaScreen Admin',
    'info@proxascreen.me',
    'admin',
    TRUE
) ON CONFLICT (email) DO NOTHING;

-- +goose Down
DELETE FROM users WHERE email = 'info@proxascreen.me';
