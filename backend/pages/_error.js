import React from 'react';
import PropTypes from 'prop-types';

class Error extends React.Component {
    static getInitialProps({ res, err }) {
        const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
        return { statusCode };
    }

    render() {
        return (
            <div style={{ textAlign: 'center', marginTop: '50px' }}>
                <h1>Error {this.props.statusCode}</h1>
                <p>
                    {this.props.statusCode === 404
                        ? 'This page could not be found.'
                        : 'An unexpected error has occurred.'}
                </p>
            </div>
        );
    }
}

Error.propTypes = {
    statusCode: PropTypes.number.isRequired
};

export default Error;
