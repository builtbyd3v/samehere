import PortfolioDemoLazy from "./PortfolioDemoLazy";

export default function ProjectStory() {
  return (
    <section id="product" className="landing-project-story reveal-view">
      <div className="landing-project-copy">
        <p>Projects</p>
        <h2>Give your project a story.</h2>
        <p>
          Turn a public GitHub repo into a private draft you can edit. Share it
          when you are ready.
        </p>
      </div>
      <PortfolioDemoLazy />
    </section>
  );
}
