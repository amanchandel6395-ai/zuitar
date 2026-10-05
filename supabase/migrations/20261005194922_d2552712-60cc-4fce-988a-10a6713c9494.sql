CREATE TABLE public.ai_person_poses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '📸',
  prompt text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.ai_person_poses TO authenticated;
GRANT ALL ON public.ai_person_poses TO service_role;

ALTER TABLE public.ai_person_poses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read active person poses"
ON public.ai_person_poses
FOR SELECT
TO authenticated
USING (is_active OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "admins manage person poses"
ON public.ai_person_poses
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ai_person_poses_updated_at
BEFORE UPDATE ON public.ai_person_poses
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

INSERT INTO public.ai_person_poses (name, emoji, prompt, sort_order) VALUES
  ('Side by side', '👥', 'Place the selected character beside the customer, both facing the camera in a relaxed friendly pose. Keep a natural comfortable distance and preserve both identities.', 0),
  ('Handshake', '🤝', 'Create a natural handshake between the selected character and the customer. Their hands must connect anatomically correctly, both bodies should face each other slightly, and both identities must remain recognizable.', 1),
  ('Hand on shoulder', '🫱', 'Place the selected character beside the customer with one hand resting naturally and respectfully on the customer''s near shoulder. Ensure anatomically correct arms and hands and preserve both identities.', 2),
  ('Side pose', '📸', 'Pose the selected character and customer side by side at a slight three-quarter angle toward the camera, like a professionally composed event photograph. Preserve both identities.', 3);