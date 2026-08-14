(() => {
  'use strict';

  const STORAGE_KEY_USERS = 'writersCommunity_users';
  const STORAGE_KEY_COMMUNITIES = 'writersCommunity_communities';
  const DEFAULT_COVER = '../assets/img/capaPadraoHistorias.png';
  const DEFAULT_COMMUNITY_IMAGE = '../assets/img/fantasia.png';

  const deriveEmailHash = async (email) => {
    const encoder = new TextEncoder();
    const emailLower = email.toLowerCase().trim();
    const emailBuffer = encoder.encode(emailLower);

    const baseKey = await window.crypto.subtle.importKey(
      'raw',
      emailBuffer,
      'PBKDF2',
      false,
      ['deriveBits'],
    );

    const hashBuffer = await window.crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        salt: emailBuffer,
        iterations: 1000,
        hash: 'SHA-256',
      },
      baseKey,
      256,
    );

    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  };

  const createStandardUser = async () => {
    const usersStorage = localStorage.getItem(STORAGE_KEY_USERS);
    const users = usersStorage ? JSON.parse(usersStorage) : {};

    const emailHash = await deriveEmailHash(
      'standard@contadoresdehistorias.com',
    );

    let isNewUser = true;
    if (users[emailHash]) {
      isNewUser = false;
    }

    const standardUser = {
      emailHash,
      fullname: 'Renan Antonio',
      bio: 'Apaixonado por histórias e narrativas criativas.',
      createdAt: Date.now(),
      stories: [
        {
          title: 'A Primeira Luz',
          synopsis:
            'Uma história sobre descoberta, coragem e a primeira luz que ilumina o caminho de quem sonha em criar.',
          type: 'Conto',
          status: 'em-andamento',
          content:
            '<p>Em um mundo onde as histórias eram escritas nas estrelas, havia um jovem que sonhava em escrever sua própria constelação.</p><p>Cada noite, ele observava o céu e imaginava letras brilhantes formando palavras mágicas. "Um dia", pensou, "eu também terei minha história contada."</p>',
          cover: DEFAULT_COVER,
          createdAt: new Date().toLocaleDateString('pt-BR'),
        },
      ],
      drafts: [],
      communities: [
        {
          id: `comm_${Date.now()}_std01`,
          name: 'Fanart',
          category: 'Histórias',
          createdAt: new Date().toLocaleDateString('pt-BR'),
          image: DEFAULT_COMMUNITY_IMAGE,
          memberCount: 1,
        },
      ],
    };

    if (isNewUser) {
      users[emailHash] = standardUser;
      localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(users));
    }

    const communitiesStorage = localStorage.getItem(STORAGE_KEY_COMMUNITIES);
    const communities = communitiesStorage
      ? JSON.parse(communitiesStorage)
      : [];

    if (isNewUser) {
      if (!communities.find((c) => c.id === standardUser.communities[0].id)) {
        communities.unshift(standardUser.communities[0]);
        localStorage.setItem(
          STORAGE_KEY_COMMUNITIES,
          JSON.stringify(communities),
        );
      }
    }

    const postsStorageKey = 'comentariosComunidade_posts_fanart';
    const existingPosts = localStorage.getItem(postsStorageKey);
    const posts = existingPosts ? JSON.parse(existingPosts) : {};

    if (isNewUser && Object.keys(posts).length === 0) {
      const initialPostId = `post_${Date.now()}_fanart`;
      posts[initialPostId] = {
        content:
          'Bem-vindos à comunidade Fanart! Aqui podemos compartilhar nossas criações e inspirações. Sinta-se livre para postar suas artes, discussões sobre mangás e tudo mais que envolve o universo fandom!',
        author: 'Renan Antonio',
        timestamp: new Date().toISOString(),
        authorEmailHash: emailHash,
      };

      posts[initialPostId].comments = [
        {
          author: 'Renan Antonio',
          text: 'Que alegria ter essa comunidade aqui! Vamos criar juntos e compartilhar nossas melhores histórias. Contadores de Histórias é o lugar certo para quem ama narrativas!',
          timestamp: new Date().toISOString(),
          emailHash: emailHash,
        },
      ];

      localStorage.setItem(postsStorageKey, JSON.stringify(posts));
    }

    const fixedCommunities = communities.map((c) => {
      if (
        typeof c.image === 'string' &&
        !c.image.includes('iconComunidade') &&
        !c.image.startsWith('data:')
      ) {
        return { ...c, image: DEFAULT_COMMUNITY_IMAGE };
      }
      return c;
    });

    if (fixedCommunities !== communities) {
      localStorage.setItem(
        STORAGE_KEY_COMMUNITIES,
        JSON.stringify(fixedCommunities),
      );
    }
  };

  createStandardUser();
})();
