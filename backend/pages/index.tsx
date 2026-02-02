import { GetServerSideProps } from 'next';

// Simple server-side redirect to /cloud
export const getServerSideProps: GetServerSideProps = async () => {
    return {
        redirect: {
            destination: '/cloud',
            permanent: true,
        },
    };
};

// This component won't render due to the redirect
const HomePage = () => null;

export default HomePage;
