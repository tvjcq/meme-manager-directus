export default ({ filter, action }, { services, getSchema, logger }) => {
  // Confirme que l'extension est chargée
  action("extensions.load", ({ extensions }) => {
    logger.info(
      `[github-avatar] extension chargée. (${extensions.length} extensions détectées)`
    );
  });

  // IMPORTANT : c'est un FILTER (pas action)
  filter("auth.create", async (user, meta, context) => {
    try {
      const { provider, providerPayload } = meta;
      if (provider !== "github") return user;

      const avatarUrl =
        providerPayload?.avatar_url ||
        providerPayload?.userInfo?.avatar_url || // <-- Ajout ici
        providerPayload?.photos?.[0]?.value ||
        null;

      if (!avatarUrl) {
        logger.warn(
          "[github-avatar] Pas d'avatar_url dans providerPayload — payload complet :\n" +
            JSON.stringify(providerPayload, null, 2)
        );
        return user; // on ne bloque pas la création
      }

      const { FilesService } = services;

      // Instancie le service avec le schema courant
      const files = new FilesService({
        schema: await getSchema(),
        // Omettre accountability = permissions admin
        // (tu peux mettre null pour "public" si tu préfères)
      });

      // Importe l’avatar depuis l’URL GitHub
      const fileId = await files.importOne(avatarUrl, {
        filename_download: `github-${Date.now()}.jpg`,
        title: `Avatar GitHub`,
        storage: "local",
        folder: "8324f9f4-83a5-41d9-bc55-0999a9c86cb4",
      });

      // On modifie le payload utilisateur AVANT création
      user.avatar = fileId;

      logger.info(
        "[github-avatar] Avatar importé et associé au nouvel utilisateur"
      );
    } catch (e) {
      logger.error(e, "[github-avatar] Échec import avatar");
    }

    return user; // toujours retourner le payload en filter
  });
};
