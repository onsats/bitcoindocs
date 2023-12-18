import React from 'react';
import clsx from 'clsx';
import styles from './styles.module.css';

const FeatureList = [
  {
    title: 'Conquer the Basics',
    icon: "📚",
    // Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Grasp the foundational principles of Bitcoin. From its inception to its underlying technology, start your
        journey with a solid footing in the world of decentralized currency.
      </>
    ),
  },
  {
    title: 'Dive Into Tutorials',
    icon: "👷",
    // Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        From simple transactions to intricate scripts and contracts, our step-by-step guides will immerse you in the
        mechanics of Bitcoin. Elevate your knowledge, one tutorial at a time.
      </>
    ),
  },
  {
    title: 'Join the Builders',
    icon: "🏗️",
    // Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Become a part of a community pushing the boundaries of Bitcoin. Collaborate, innovate, and shape
        the future of decentralized finance with fellow visionaries.
      </>
    ),
  },
];

function Feature({icon, title, description}) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.icon}>
        {icon}
        {/* <Svg className={styles.featureSvg} role="img" /> */}
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures() {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
