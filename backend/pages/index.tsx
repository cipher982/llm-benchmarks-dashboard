import { GetServerSideProps } from 'next';

// Simple server-side redirect to /cloud
export const getServerSideProps: GetServerSideProps = async () => {
    return {
        redirect: {
            destination: '/cloud',
            permanent: false,
        },
    };
};

// This component won't render due to the redirect
const HomePage = () => null;

export default HomePage;
