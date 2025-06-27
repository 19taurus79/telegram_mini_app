
import SideBar from "@/components/SideBar/SideBar";

type Props = {
  children: React.ReactNode;
  sidebar: React.ReactNode;
};

const RemainsLayout = ({ children, sidebar }: Props) => {
  return (
    <section>
      <SideBar sidebar={sidebar}>
        <div>{children}</div>
      </SideBar>
    </section>
  );
};

export default RemainsLayout;
