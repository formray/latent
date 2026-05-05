# X Thread — Launch Draft

1/ At Formray we are passionate about photography, and like many Fujifilm
users, we have always loved recipes: small sets of choices that can completely
change how a scene feels.

That is why we built Latent.

2/ Latent is an open-source lab for Fujifilm recipes.

It is not just a static list of settings. It is a local workspace for creating,
saving, importing, exporting, and testing looks with a real camera when one is
connected.

3/ The first problem we wanted to solve was simple: do not lose the recipes
already on your camera.

Latent can read custom slots, import them into a local library, and help you
back them up before writing anything over C1-C4.

4/ Then we added the Creator.

Start from a photographic intent, duplicate an existing recipe, or manually edit
the main Fuji controls: film simulation, DR, white balance shift, tone, color,
grain, chrome effects, clarity, and more.

5/ Every generated recipe is validated against the Latent schema and can be
exported as JSON.

That means you can build a personal library, share recipes, version them, or
simply keep them safe outside the camera.

6/ The RAF workspace is where the camera becomes the rendering engine.

With a compatible camera connected, Latent can send a RAF to the body and use
the real Fujifilm processor to render the selected look.

7/ This is still a hardware-backed alpha.

We have focused hands-on validation on X-S20 and X-M5. WebUSB requires
Chrome/Edge/Arc and USB/PTP mode. Some flows are already solid; others need
reports from more photographers and more camera models.

8/ A transparent technical note: Kelvin is not yet reliable as a visual control
inside the current RAF loop, while R/B white balance shift is.

We documented the limitation because camera tools should be honest about what
is verified and what still needs protocol work.

9/ Latent is independent and not affiliated with Fujifilm.

It also builds on the path opened by FilmKit and the wider PTP/WebUSB community.
Our focus is safety, backups, schema discipline, and a real lab workflow.

10/ We are making it open source because this only becomes truly useful if more
photographers test it on their own cameras.

If you have a recent Fujifilm body, model + firmware + what works/does not work
is exactly the feedback we need.

11/ Repo:
<GITHUB_LINK>

Screenshots / release notes:
<LAUNCH_LINK>

Precise, technical feedback is very welcome. The goal is a local, open, serious
tool for photographers who care about the look in camera.
