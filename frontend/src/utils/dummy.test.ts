describe('Frontend Setup', () => {
    it('should pass test setup verification', () => {
        expect(true).toBe(true);
    });

    it('should have access to DOM', () => {
        const element = document.createElement('div');
        element.innerHTML = 'Hello';
        expect(element).toHaveTextContent('Hello');
    });
});
