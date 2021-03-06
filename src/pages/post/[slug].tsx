import { GetStaticPaths, GetStaticProps } from 'next';
import Head from 'next/head';
import Prismic from '@prismicio/client';
import { RichText } from 'prismic-dom';

import { format } from 'date-fns';
import ptBR from 'date-fns/locale/pt-BR';
import { FiCalendar, FiClock, FiUser } from 'react-icons/fi';

import { useRouter } from 'next/router';
import { getPrismicClient } from '../../services/prismic';

import commonStyles from '../../styles/common.module.scss';
import styles from './post.module.scss';

interface Post {
  uid?: string;
  first_publication_date: string | null;
  data: {
    title: string;
    subtitle: string;
    banner: {
      url: string;
    };
    author: string;
    content: {
      heading: string;
      body: {
        text: string;
      }[];
    }[];
  };
}

interface PostProps {
  post: Post;
  // readingTime: string;
}

export default function Post({ post }: PostProps): JSX.Element {
  const router = useRouter();

  if (router.isFallback) {
    return <h1>Carregando...</h1>;
  }

  function evaluateReadTime(content: Post['data']['content']): number {
    // Calculate read time
    const { totalHeading, totalBody } = content.reduce(
      (total, item) => {
        total.totalHeading += item.heading.split(' ').length;
        total.totalBody += RichText.asText(item.body).split(' ').length;
        return total;
      },
      {
        totalHeading: 0,
        totalBody: 0,
      }
    );

    const totalWords = totalHeading + totalBody;
    return Math.ceil(totalWords / 200);
  }

  return (
    <>
      <Head>
        <title> {post.data.title} | Spacetraveling </title>
      </Head>

      <main className={styles.container}>
        <img src={post.data.banner.url} alt="logo" />
        <article className={styles.postContainer}>
          <header>
            <strong>{post.data.title}</strong>
            <div className={commonStyles.postInfo}>
              <time>
                <FiCalendar />
                {format(new Date(post.first_publication_date), 'dd MMM yyyy', {
                  locale: ptBR,
                })}
              </time>
              <p>
                <FiUser /> {post.data.author}
              </p>
              <time>
                <FiClock /> {`${evaluateReadTime(post.data.content)} min`}
              </time>
            </div>
          </header>
          {post.data.content.map(cte => {
            const { heading, body } = cte;
            return (
              <section className={styles.postBody} key={heading}>
                <h2 dangerouslySetInnerHTML={{ __html: heading }} />
                <div
                  dangerouslySetInnerHTML={{ __html: RichText.asHtml(body) }}
                />
              </section>
            );
          })}
        </article>
      </main>
    </>
  );
}

export const getStaticPaths: GetStaticPaths = async () => {
  const prismic = getPrismicClient();

  const posts = await prismic.query(
    [Prismic.predicates.at('document.type', 'posts')],
    {
      fetch: ['posts.title', 'posts.subtitle', 'posts.author', 'posts.content'],
    }
  );

  // Get the paths we want to pre-render based on posts
  const paths = posts.results.map(post => ({
    params: { slug: post.uid },
  }));
  return { paths, fallback: true };
};

export const getStaticProps: GetStaticProps = async context => {
  const { slug } = context.params;

  const prismic = getPrismicClient();

  const response = await prismic.getByUID('posts', String(slug), {});

  // Getting post data
  const post = {
    uid: response.uid,
    first_publication_date: response.first_publication_date,
    data: {
      title: response.data.title,
      subtitle: response.data.subtitle,
      banner: {
        url: response.data.banner.url,
      },
      author: response.data.author,
      content: response.data.content.map(item => {
        return {
          heading: item.heading,
          body: item.body,
        };
      }),
    },
  };

  return {
    props: {
      post,
    },
    revalidate: 60 * 60 * 24, // 24 hour
  };
};
